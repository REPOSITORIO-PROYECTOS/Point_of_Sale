import { createPrivateKey, createPublicKey, createSign, generateKeyPairSync } from 'node:crypto';

type GenerateAfipCsrInput = {
  cuit: string;
  organization: string;
  commonName: string;
};

type GenerateAfipCsrResult = {
  privateKeyPem: string;
  csrPem: string;
};

function encodeLength(length: number): Buffer {
  if (length < 0x80) {
    return Buffer.from([length]);
  }

  const bytes: number[] = [];
  let value = length;

  while (value > 0) {
    bytes.unshift(value & 0xff);
    value >>= 8;
  }

  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function encodeTag(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), encodeLength(content.length), content]);
}

function encodeSequence(parts: Buffer[]): Buffer {
  return encodeTag(0x30, Buffer.concat(parts));
}

function encodeSet(parts: Buffer[]): Buffer {
  return encodeTag(0x31, Buffer.concat(parts));
}

function encodeInteger(value: number): Buffer {
  return encodeTag(0x02, Buffer.from([value]));
}

function encodeNull(): Buffer {
  return Buffer.from([0x05, 0x00]);
}

function encodeOid(oid: string): Buffer {
  const parts = oid.split('.').map(Number);
  const bytes: number[] = [40 * parts[0] + parts[1]];

  for (let index = 2; index < parts.length; index += 1) {
    let value = parts[index];
    const encoded: number[] = [value & 0x7f];

    while ((value >>= 7) > 0) {
      encoded.unshift((value & 0x7f) | 0x80);
    }

    bytes.push(...encoded);
  }

  return encodeTag(0x06, Buffer.from(bytes));
}

function encodeString(tag: number, value: string): Buffer {
  return encodeTag(tag, Buffer.from(value, 'utf8'));
}

function encodeAttribute(oid: string, value: string, tag: number): Buffer {
  return encodeSequence([encodeOid(oid), encodeString(tag, value)]);
}

function encodeSubject(input: GenerateAfipCsrInput): Buffer {
  const cuit = input.cuit.replace(/\D/g, '');

  const attributes = [
    encodeSet([encodeAttribute('2.5.4.6', 'AR', 0x13)]),
    encodeSet([encodeAttribute('2.5.4.10', input.organization, 0x13)]),
    encodeSet([encodeAttribute('2.5.4.3', input.commonName, 0x13)]),
    encodeSet([encodeAttribute('2.5.4.5', `CUIT ${cuit}`, 0x0c)]),
  ];

  return encodeSequence(attributes);
}

function encodeBitString(signature: Buffer): Buffer {
  const content = Buffer.concat([Buffer.from([0x00]), signature]);
  return encodeTag(0x03, content);
}

function toPem(label: string, der: Buffer): string {
  const body = der.toString('base64').match(/.{1,64}/g)?.join('\n') ?? der.toString('base64');
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

function buildCsrPem(privateKeyPem: string, input: GenerateAfipCsrInput): string {
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'der' }) as Buffer;

  const certificationRequestInfo = encodeSequence([
    encodeInteger(0),
    encodeSubject(input),
    publicKey,
    encodeSequence([]),
  ]);

  const signature = createSign('RSA-SHA256')
    .update(certificationRequestInfo)
    .sign(privateKey);

  const csrDer = encodeSequence([
    certificationRequestInfo,
    encodeSequence([encodeOid('1.2.840.113549.1.1.11'), encodeNull()]),
    encodeBitString(signature),
  ]);

  return toPem('CERTIFICATE REQUEST', csrDer);
}

export function generateAfipCsrFromPrivateKey(
  privateKeyPem: string,
  input: GenerateAfipCsrInput,
): string {
  return buildCsrPem(privateKeyPem, input);
}

export function generateAfipCsr(input: GenerateAfipCsrInput): GenerateAfipCsrResult {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    privateKeyPem: privateKey,
    csrPem: buildCsrPem(privateKey, input),
  };
}
