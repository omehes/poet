import {
  TextDocument
} from 'vscode-languageserver-textdocument'
import {
  parseXMLString, validateImagePaths, IMAGEPATH_DIAGNOSTIC_SOURCE
} from './../utils'

import assert from 'assert'
import mockfs from 'mock-fs'
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver'

describe('parseXMLString', function () {
  it('should return null on bad XML', async function () {
    const inputContent = `
      <document></documentt>
    `
    const inputDocument = TextDocument.create('', '', 0, inputContent)
    const result = await parseXMLString(inputDocument)
    assert.strictEqual(result, null)
  })

  it('should return an object on valid XML', async function () {
    const inputContent = `
      <document>
        <content></content>
      </document>
    `
    const inputDocument = TextDocument.create('', '', 0, inputContent)
    const result = await parseXMLString(inputDocument)
    assert(result instanceof Object)
  })
})

describe('validateImagePaths', function () {
  before(function () {
    mockfs({
      '/media/image1.jpg': ''
    })
  })
  after(function () {
    mockfs.restore()
  })
  it('should return empty diagnostics when no images', async function () {
    const inputContent = `
      <document>
        <content></content>
      </document>
    `
    const inputDocument = TextDocument.create(
      'file:///modules/m12345/index.cnxml', '', 0, inputContent
    )
    const xmlData = await parseXMLString(inputDocument)
    const result = await validateImagePaths(inputDocument, xmlData)
    assert.deepStrictEqual(result, [])
  })
  it('should return empty diagnostics when all images are valid', async function () {
    const inputContent = `
      <document>
        <content>
          <image src="../../media/image1.jpg" />
        </content>
      </document>
    `
    const inputDocument = TextDocument.create(
      'file:///modules/m12345/index.cnxml', '', 0, inputContent
    )
    const xmlData = await parseXMLString(inputDocument)
    const result = await validateImagePaths(inputDocument, xmlData)
    assert.deepStrictEqual(result, [])
  })
  it('should return diagnostics when images are invalid', async function () {
    const inputContent = `
      <document>
        <content>
          <image src="../../media/image1.jpg" />
          <image src="../../media/image2.jpg" />
          <image src="../../media/image3.jpg" />
        </content>
      </document>
    `
    const inputDocument = TextDocument.create(
      'file:///modules/m12345/index.cnxml', '', 0, inputContent
    )
    const xmlData = await parseXMLString(inputDocument)
    const result = await validateImagePaths(inputDocument, xmlData)
    const image2Location = inputContent.indexOf('../../media/image2.jpg')
    const image3Location = inputContent.indexOf('../../media/image3.jpg')
    const expectedDiagnostic1: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: inputDocument.positionAt(image2Location),
        end: inputDocument.positionAt(image2Location + '../../media/image2.jpg'.length)
      },
      message: 'Image file ../../media/image2.jpg doesn\'t exist!',
      source: IMAGEPATH_DIAGNOSTIC_SOURCE
    }
    const expectedDiagnostic2: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: inputDocument.positionAt(image3Location),
        end: inputDocument.positionAt(image3Location + '../../media/image3.jpg'.length)
      },
      message: 'Image file ../../media/image3.jpg doesn\'t exist!',
      source: IMAGEPATH_DIAGNOSTIC_SOURCE
    }
    assert.deepStrictEqual(result, [expectedDiagnostic1, expectedDiagnostic2])
  })
  it('should ignore incomplete image elements', async function () {
    const inputContent = `
      <document>
        <content>
          <image src="../../media/image1.jpg" />
          <image />
        </content>
      </document>
    `
    const inputDocument = TextDocument.create(
      'file:///modules/m12345/index.cnxml', '', 0, inputContent
    )
    const xmlData = await parseXMLString(inputDocument)
    const result = await validateImagePaths(inputDocument, xmlData)
    assert.deepStrictEqual(result, [])
  })
})
