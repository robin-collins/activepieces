
    import { createCustomApiCallAction } from '@activepieces/pieces-common';
    import { PieceAuth, Property, createPiece } from "@activepieces/pieces-framework";
    import { PieceCategory } from '@activepieces/shared';
    import { askLocalOpenAI } from './lib/actions/ask-local-llm';

    export const localOpenaiAuth = PieceAuth.CustomAuth({
      props: {
        base_url: Property.ShortText({
          displayName: 'Local Server URL',
          description: 'Local OpenAI Instance URL',
          required: true,
        }),
        access_token: Property.ShortText({
          displayName: 'Access Token',
          description: 'LocalAI Access Token',
          required: false,
        }),
      },
      required: true,
    });
  

    export const localOpenai = createPiece({
      displayName: "Local-openai",
      auth: localOpenaiAuth,
      minimumSupportedRelease: '0.5.0',
      logoUrl: "https://adlists.teamcollins.net/icons/local-openai.png",
      authors: [ 'robin-collins'],
      categories: [PieceCategory.ARTIFICIAL_INTELLIGENCE],
      actions: [
        askLocalOpenAI,
        createCustomApiCallAction({
          baseUrl: (auth) => (auth as { base_url: string }).base_url,
          auth: localOpenaiAuth,
          authMapping: (auth) => ({
            Authorization: `Bearer ${
              (auth as { access_token: string }).access_token || ''
            }`,
          }),
        }),
      ],
      triggers: [],
    });
    