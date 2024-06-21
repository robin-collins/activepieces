import { AuthenticationServiceHooks } from '../../../../authentication/authentication-service/hooks/authentication-service-hooks'
import { platformService } from '../../../../platform/platform.service'
import { projectService } from '../../../../project/project-service'
import { userService } from '../../../../user/user-service'
import { userInvitationsService } from '../../../../user-invitations/user-invitation.service'
import { licenseKeysService } from '../../../license-keys/license-keys-service'
import { authenticationHelper } from './authentication-helper'
import { system, SystemProp } from '@activepieces/server-shared'

const DEFAULT_PLATFORM_NAME = 'Activepieces'

export const enterpriseAuthenticationServiceHooks: AuthenticationServiceHooks = {
    async preSignIn({ email, platformId, provider }) {
        await authenticationHelper.assertEmailAuthIsEnabled({
            platformId,
            provider,
        })
        await authenticationHelper.assertDomainIsAllowed({ email, platformId })
    },
    async preSignUp({ email, platformId, provider }) {
        await authenticationHelper.assertEmailAuthIsEnabled({
            platformId,
            provider,
        })
        await authenticationHelper.assertUserIsInvitedAndDomainIsAllowed({
            email,
            platformId,
        })
    },
    async postSignUp({ user }) {
        const platformCreated = await platformService.hasAnyPlatforms()
        if (platformCreated) {
            await authenticationHelper.autoVerifyUserIfEligible(user)
            await userInvitationsService.provisionUserInvitation({
                email: user.email,
                platformId: user.platformId!,
            })
            const updatedUser = await userService.getOneOrFail({ id: user.id })
            const result = await authenticationHelper.getProjectAndTokenOrThrow(user)
            return {
                user: updatedUser,
                ...result,
            }
        }

        const platform = await platformService.create({
            ownerId: user.id,
            name: DEFAULT_PLATFORM_NAME,
        })


        await projectService.create({
            displayName: `${user.firstName}'s Project`,
            ownerId: user.id,
            platformId: platform.id,
        })

        await licenseKeysService.verifyKeyAndApplyLimits({
            platformId: platform.id,
            license: system.get<string>(SystemProp.LICENSE_KEY),
        })

        await userInvitationsService.provisionUserInvitation({
            email: user.email,
            platformId: user.platformId!,
        })

        await userService.verify({ id: user.id })
        const updatedUser = await userService.getOneOrFail({ id: user.id })
        const result = await authenticationHelper.getProjectAndTokenOrThrow(updatedUser)
        return {
            user: updatedUser,
            ...result,
        }
    },

    async postSignIn({ user }) {
        const result = await authenticationHelper.getProjectAndTokenOrThrow(user)
        return {
            user,
            ...result,
        }
    },
}
