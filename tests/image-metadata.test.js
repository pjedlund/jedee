// The image shortcode's keepMetadata opt-in: originals keep their XMP licence and caption, never GPS or the creator's contact details.
// Run: npm run test:unit   (or: node --test tests/image-metadata.test.js)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'

import { cleanXmp, keepOriginalMetadata } from '../src/_config/shortcodes/image.js'

const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
 <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/" xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/" exif:GPSLatitude="55,36.0085N" xmpRights:WebStatement="https://github.com/pjedlund/soli-deo-gloria-dedication">
  <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">Public domain</rdf:li></rdf:Alt></dc:rights>
  <dc:description><rdf:Alt><rdf:li xml:lang="x-default">Utsikt över Öresund</rdf:li></rdf:Alt></dc:description>
  <exif:GPSLongitude>12,57.3855E</exif:GPSLongitude>
  <Iptc4xmpCore:CreatorContactInfo rdf:parseType="Resource">
   <Iptc4xmpCore:CiAdrExtadr>Example Street 1</Iptc4xmpCore:CiAdrExtadr>
   <Iptc4xmpCore:CiEmailWork>someone@example.com</Iptc4xmpCore:CiEmailWork>
  </Iptc4xmpCore:CreatorContactInfo>
 </rdf:Description>
</rdf:RDF></x:xmpmeta>`

test('cleanXmp: drops GPS and contact details, keeps licence and caption', () => {
  const out = cleanXmp(xmp)
  assert.ok(!/GPS/.test(out), 'no GPS left')
  assert.ok(!/Example Street|someone@example\.com|CreatorContactInfo/.test(out), 'no contact details left')
  assert.match(out, /soli-deo-gloria-dedication/)
  assert.match(out, /Public domain/)
  assert.match(out, /Utsikt över Öresund/)
})

test('cleanXmp: contact details written as attributes are dropped too', () => {
  const out = cleanXmp('<Iptc4xmpCore:CreatorContactInfo Iptc4xmpCore:CiTelWork="+46 0" Iptc4xmpCore:CiEmailWork="a@b.c"/>')
  assert.equal(out, '')
})

for (const format of ['jpeg', 'webp', 'avif']) {
  test(`keepOriginalMetadata (${format}): XMP licence kept, EXIF GPS and contact details gone`, async () => {
    const source = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#888' } })
      .withExif({ IFD0: { Artist: 'Test' }, IFD3: { GPSLatitudeRef: 'N' } })
      .withXmp(xmp)
      .jpeg()
      .toBuffer()
    const image = sharp(source)
    await keepOriginalMetadata(image)
    const out = await image.toFormat(format).toBuffer()
    const meta = await sharp(out).metadata()
    const kept = meta.xmp?.toString('utf8') ?? ''
    assert.match(kept, /soli-deo-gloria-dedication/)
    assert.ok(!/GPS|CreatorContactInfo|someone@example\.com/.test(kept), 'no GPS or contact details in XMP')
    assert.equal(meta.exif, undefined, 'no EXIF block')
  })
}
