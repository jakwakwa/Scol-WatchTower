## Documentation Index
Fetch the complete documentation index at: https://resend.com/docs/llms.txt
Use this file to discover all available pages before exploring further.

# Send emails with Next.js

Learn how to send your first email using Next.js and the Resend Node.js SDK.

export const YouTube = ({id}) ={
  return <iframe className="w-full aspect-video rounded-xl" src={`https://www.youtube.com/embed/${id}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
};

## Prerequisites

To get the most out of this guide, you'll need to:

* [Create an API key](https://resend.com/api-keys)
* [Verify your domain](https://resend.com/domains)

Prefer watching a video? Check out our video walkthrough below.

<YouTube id="UqQxfpTQBaE" />

## 1. Install

Get the Resend Node.js SDK.

<CodeGroup>
  ```bash npm theme={"theme":{"light":"github-light","dark":"vesper"}}
  npm install resend
  ```

  ```bash yarn theme={"theme":{"light":"github-light","dark":"vesper"}}
  yarn add resend
  ```

  ```bash pnpm theme={"theme":{"light":"github-light","dark":"vesper"}}
  pnpm add resend
  ```

  ```bash bun theme={"theme":{"light":"github-light","dark":"vesper"}}
  bun add resend
  ```
</CodeGroup>

## 2. Create an email template

Start by creating your email template on `components/email-template.tsx`.

```tsx components/email-template.tsx theme={"theme":{"light":"github-light","dark":"vesper"}}
import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
}

export function EmailTemplate({ firstName }: EmailTemplateProps) {
  return (
    <div>
      <h1>Welcome, {firstName}!</h1>
    </div>
  );
}
```

## 3. Send email using React

Create a route file under `app/api/send/route.ts` (or `pages/api/send.ts` if you're using [Pages Router](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)).

Import the React email template and send an email using the `react` parameter.

<CodeGroup>
  ```ts app/api/send/route.ts theme={"theme":{"light":"github-light","dark":"vesper"}}
  import { EmailTemplate } from '../../../components/email-template';
  import { Resend } from 'resend';

  const resend = new Resend(process.env.RESEND_API_KEY);

  export async function POST() {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: ['delivered@resend.dev'],
        subject: 'Hello world',
        react: EmailTemplate({ firstName: 'John' }),
      });

      if (error) {
        return Response.json({ error }, { status: 500 });
      }

      return Response.json(data);
    } catch (error) {
      return Response.json({ error }, { status: 500 });
    }
  }
  ```

  ```ts pages/api/send.ts theme={"theme":{"light":"github-light","dark":"vesper"}}
  import type { NextApiRequest, NextApiResponse } from 'next';
  import { EmailTemplate } from '../../components/email-template';
  import { Resend } from 'resend';

  const resend = new Resend(process.env.RESEND_API_KEY);

  export default async (req: NextApiRequest, res: NextApiResponse) ={
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Hello world',
      react: EmailTemplate({ firstName: 'John' }),
    });

    if (error) {
      return res.status(400).json(error);
    }

    res.status(200).json(data);
  };
  ```
</CodeGroup>

## 4. Try it yourself

<CardGroup>
  <Card title="Next.js Example (App Router)" icon="arrow-up-right-from-square" href="https://github.com/resend/resend-nextjs-app-router-example">
    See the full source code.
  </Card>

  <Card title="Next.js Example (Pages Router)" icon="arrow-up-right-from-square" href="https://github.com/resend/resend-nextjs-pages-router-example">
    See the full source code.
  </Card>
</CardGroup>
