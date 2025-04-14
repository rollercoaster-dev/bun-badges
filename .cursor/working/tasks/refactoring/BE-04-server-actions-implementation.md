# BE-04: Server Actions Implementation

## Description
Implement Next.js server actions for form handling and data mutations, following Badge Engine's approach for cleaner, more efficient server-client interactions.

## Tasks
- [ ] Identify forms and data mutations in our application that could benefit from server actions
- [ ] Create server action files organized by domain
- [ ] Implement form validation using Zod or similar validation libraries
- [ ] Add proper error handling and response formatting
- [ ] Update client components to use server actions
- [ ] Add optimistic updates where appropriate
- [ ] Document server actions usage patterns

## Implementation Details
Badge Engine uses Next.js server actions for form submissions, which simplifies client-server interactions:

```typescript
// Example server action from Badge Engine
"use server";

import { revalidatePath } from "next/cache";
import { CredentialFormSchema } from "shared/interfaces/credential-form-object.interface";
import { api } from "~/trpc/server";

export const createCredential = async (
  issuer: string,
  credentialForm: FormData,
) => {
  try {
    const image = credentialForm.get("image") as unknown as Blob
    const credential = credentialForm.get("credential")

    const validatedCredential = await CredentialFormSchema.omit({image: true}).parseAsync({
      ...(JSON.parse(credential as string))
    });

    // Process the form data and save to database
    // ...

    revalidatePath(`/issuers/${issuer}`);
    return newCredential
  } catch (error) {
    console.error("createCredential error", error);
    throw new Error("Unexpected error creating credential for issuer.");
  }
};
```

## Benefits
- Reduced client-side JavaScript
- Simplified form handling
- Better separation of concerns
- Improved performance
- Enhanced security (validation happens on the server)
- Better developer experience

## References
- Badge Engine's server actions: `../badge-engine/src/server/actions/`
- Next.js Server Actions documentation: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- Form validation with Zod: https://zod.dev/
