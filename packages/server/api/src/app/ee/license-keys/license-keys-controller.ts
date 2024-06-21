import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { licenseKeysService } from './license-keys-service'
import { system, SystemProp } from '@activepieces/server-shared'
import { CreateTrialLicenseKeyRequestBody, isNil, PrincipalType } from '@activepieces/shared'

const key = system.get<string>(SystemProp.LICENSE_KEY)

export const licenseKeysController: FastifyPluginAsyncTypebox = async (app) => {

    app.post('/', CreateTrialLicenseKeyRequest, async (req) => {
        return licenseKeysService.requestTrial(req.body)
    })

    app.get('/status', async (_req, res) => {
        const licenseKey = await licenseKeysService.getKey(key)
        if (isNil(licenseKey)) {
            return res.status(StatusCodes.NOT_FOUND).send({
                message: 'No license key found',
            })
        }
        return licenseKey
    })

}

const CreateTrialLicenseKeyRequest = {
    config: {
        allowedPrincipals: [
            PrincipalType.UNKNOWN,
            PrincipalType.USER,
        ],
    },
    schema: {
        body: CreateTrialLicenseKeyRequestBody,
    },
}
