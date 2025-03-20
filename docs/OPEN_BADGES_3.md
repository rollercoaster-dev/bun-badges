# Open Badges 3.0 Support

Bun Badges implements the Open Badges 3.0 standard, which aligns with the W3C Verifiable Credentials Data Model. This document outlines the key features and endpoints for working with Open Badges 3.0 in the platform.

## Overview

Open Badges 3.0 enhances the digital badge ecosystem with:

- Cryptographic proofs for verification
- Decentralized identifiers (DIDs)
- Self-contained verification (no hosted verification required)
- Improved privacy features
- Standardized revocation mechanisms

This implementation supports both Open Badges 2.0 (for backward compatibility) and Open Badges 3.0 (for enhanced security and functionality).

## Key Features

### Cryptographic Verification

Badges are cryptographically signed using Ed25519 keys, allowing for tamper-proof verification. Each issuer is assigned a DID and key pair for badge signing.

### Verifiable Credentials

Badges follow the W3C Verifiable Credentials data model with the Open Badges 3.0 context, making them compatible with broader verifiable credential ecosystems.

### Enhanced Privacy

Improved recipient identification methods with more secure hashing and privacy-preserving features.

### Revocation Support

Badges can be revoked using cryptographic status lists, providing secure and verifiable revocation information.

## API Endpoints

### Issuing Badges (OB3.0)

To issue a badge in Open Badges 3.0 format:

```
POST /api/assertions
```

With the following request body:

```json
{
  "badgeId": "badge-uuid",
  "recipient": {
    "type": "email",
    "identity": "recipient@example.com",
    "hashed": true
  },
  "evidence": "https://example.com/evidence",
  "version": "ob3"
}
```

Setting `version` to `ob3` instructs the API to create an Open Badges 3.0 verifiable credential.

### Retrieving Badges (OB3.0)

To retrieve a badge in Open Badges 3.0 format:

```
GET /api/assertions/{assertionId}?format=ob3
```

The response will include the full credential with cryptographic proof.

### Verifying Badges

To verify a badge:

```
GET /api/verify/assertions/{assertionId}
```

For detailed verification results:

```
GET /api/verify/assertions/{assertionId}?format=detailed
```

The response includes verification status with details about signature verification, revocation status, and structural validation.

### Checking Credential Status

To check a credential's revocation status:

```
GET /api/status/{assertionId}
```

### Retrieving Status Lists

To get a status list for an issuer:

```
GET /api/status/list/{issuerId}
```

## Data Model

### Open Badge Credential (OB3.0)

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  ],
  "id": "https://example.com/assertions/1234",
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": {
    "id": "did:key:z6MkrXSQTybtqyMasfSxeRBksrz6CjHhWBMz1EKT1STM7hV3",
    "type": "Profile",
    "name": "Example Issuer"
  },
  "issuanceDate": "2025-03-19T12:00:00Z",
  "credentialSubject": {
    "type": "EmailCredentialSubject",
    "achievement": {
      "id": "https://example.com/badges/5678",
      "type": ["AchievementCredential"],
      "name": "Example Badge",
      "description": "An achievement for completing a task",
      "criteria": {
        "narrative": "Complete all required steps to earn this badge"
      },
      "image": {
        "id": "https://example.com/badges/5678/image",
        "type": "Image"
      }
    }
  },
  "credentialSchema": {
    "id": "https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json",
    "type": "JsonSchemaValidator2018"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2025-03-19T12:05:00Z",
    "verificationMethod": "did:key:z6MkrXSQTybtqyMasfSxeRBksrz6CjHhWBMz1EKT1STM7hV3#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "zQeVbY4oNQX6CbXs8EQ2zCus4Jt6FfgkU6cVZ6iNpSEsHsXvo5Aq12dbir57H2XfVP1QrFR5bqntoG5i1XB71Uw"
  }
}
```

### Status List 2021 Credential

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1"
  ],
  "id": "https://example.com/status/list/issuer-id",
  "type": ["VerifiableCredential", "StatusList2021Credential"],
  "issuer": "https://example.com/issuers/issuer-id",
  "issuanceDate": "2025-03-19T12:00:00Z",
  "credentialSubject": {
    "id": "https://example.com/status/list/issuer-id#list",
    "type": "StatusList2021",
    "statusPurpose": "revocation",
    "encodedList": "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2025-03-19T12:05:00Z",
    "verificationMethod": "did:key:z6MkrXSQTybtqyMasfSxeRBksrz6CjHhWBMz1EKT1STM7hV3#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "zQeVbY4oNQX6CbXs8EQ2zCus4Jt6FfgkU6cVZ6iNpSEsHsXvo5Aq12dbir57H2XfVP1QrFR5bqntoG5i1XB71Uw"
  }
}
```

## Implementation Details

### Signing Keys

The system automatically generates Ed25519 key pairs for issuers when they first create an OB3.0 badge. These keys are securely stored and used for signing all badges issued by that entity.

### Credential Schema

All Open Badges 3.0 credentials include a `credentialSchema` property that points to the official JSON Schema for validation:

```json
"credentialSchema": {
  "id": "https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json",
  "type": "JsonSchemaValidator2018"
}
```

This schema reference enables verifiers to validate the structure of the credential against the official IMS Global Open Badges 3.0 schema.

### Verification Process

Badge verification involves:

1. Extracting the proof from the credential
2. Retrieving the issuer's public key
3. Verifying the signature against the credential data
4. Checking revocation status
5. Validating credential structure

### Revocation Mechanism

Badges can be revoked through the API:

```
POST /api/assertions/{assertionId}/revoke
```

```json
{
  "reason": "Badge requirements updated"
}
```

Revoked OB3.0 badges use the Status List 2021 specification:

1. A bitstring encodes the revocation status of many credentials
2. Each credential is assigned an index in the bitstring
3. A bit value of 1 indicates revocation, 0 indicates valid
4. The status list is itself a verifiable credential with cryptographic proof
5. Credentials reference their position in the status list via the `credentialStatus` property

### DID Support

Decentralized Identifiers (DIDs) are used for key management:

1. Each issuer is assigned a did:key identifier
2. The DID includes the public key in multibase format
3. VerificationMethod references link signatures to specific keys
4. The implementation focuses on the did:key method (other DID methods could be added)

### Additional Supported Recipient Types

Beyond email addresses, OB3.0 supports multiple recipient identifier types:

1. `EmailCredentialSubject` - Email-based identity
2. `DidCredentialSubject` - DID-based identity
3. `UrlCredentialSubject` - URL-based identity
4. `PhoneCredentialSubject` - Phone number-based identity

## Migration from OB2.0 to OB3.0

Existing badges issued in OB2.0 format can continue to be verified through the platform. New badges can be issued in either format, with OB3.0 being recommended for enhanced security and features.

To migrate from OB2.0 to OB3.0:

1. Start issuing new badges with `version: "ob3"` parameter
2. Existing OB2.0 badges remain valid and verifiable
3. Use the format=ob3 parameter when retrieving badges to see them in OB3.0 format when possible

## Technical Implementation

The implementation uses:

- Ed25519 cryptography for digital signatures
- DIDs as persistent identifiers
- StatusList2021 for revocation tracking
- JSON-LD for semantic data representation
- PostgreSQL for storing badge and key data
- BitSet for efficient revocation status encoding
- Bun and Hono for high-performance API delivery

## Future Enhancements

- Support for additional proof formats (JsonWebSignature2020)
- DID resolution with multiple DID methods
- Integration with digital wallets
- Support for selective disclosure
- Expanded cryptographic algorithm options
- Linked data proofs with advanced canonicalization

## References

- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [W3C Status List 2021 Specification](https://w3c-ccg.github.io/vc-status-list-2021/)
- [Open Badges 3.0 Specification](https://www.imsglobal.org/spec/ob/v3p0/)
- [DID Core Specification](https://www.w3.org/TR/did-core/)
