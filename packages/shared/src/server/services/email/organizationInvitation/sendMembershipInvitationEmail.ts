import { render } from "@react-email/render";
import { createMailTransport } from "../transport";

import MembershipInvitationTemplate from "./MembershipInvitationEmailTemplate";
import { logger } from "../../../logger";

const aletheiaUrls = {
  US: "https://us.cloud.aletheia.com",
  EU: "https://cloud.aletheia.com",
  STAGING: "https://staging.aletheia.com",
  HIPAA: "https://hipaa.cloud.aletheia.com",
  JP: "https://jp.cloud.aletheia.com",
};

type SendMembershipInvitationParams = {
  env: Partial<
    Record<
      | "EMAIL_FROM_ADDRESS"
      | "SMTP_CONNECTION_URL"
      | "NEXT_PUBLIC_ALETHEIA_CLOUD_REGION"
      | "NEXTAUTH_URL",
      string | undefined
    >
  >;
  to: string;
  inviterName: string;
  inviterEmail: string;
  orgName: string;
  orgId: string;
  userExists: boolean;
};

export const sendMembershipInvitationEmail = async ({
  env,
  to,
  inviterName,
  inviterEmail,
  orgName,
  orgId,
  userExists,
}: SendMembershipInvitationParams) => {
  if (!env.EMAIL_FROM_ADDRESS || !env.SMTP_CONNECTION_URL) {
    logger.error(
      "Missing environment variables for sending membership invitation email.",
    );
    return;
  }

  const getAuthURL = () =>
    env.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION === "US" ||
    env.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION === "EU" ||
    env.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION === "HIPAA" ||
    env.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION === "JP" ||
    env.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION === "STAGING"
      ? aletheiaUrls[env.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION]
      : env.NEXTAUTH_URL;

  const authUrl = getAuthURL();
  if (!authUrl) {
    logger.error(
      "Missing NEXTAUTH_URL or NEXT_PUBLIC_ALETHEIA_CLOUD_REGION environment variable.",
    );
    return;
  }

  // Generate appropriate link based on whether user exists
  const inviteLink = userExists
    ? `${authUrl}/organization/${orgId}`
    : `${authUrl}/auth/sign-up?targetPath=${encodeURIComponent(`/organization/${orgId}`)}&email=${encodeURIComponent(to)}`;

  try {
    const mailer = createMailTransport(env.SMTP_CONNECTION_URL);

    const htmlTemplate = await render(
      MembershipInvitationTemplate({
        invitedByUsername: inviterName,
        invitedByUserEmail: inviterEmail,
        orgName: orgName,
        receiverEmail: to,
        inviteLink: inviteLink,
        userExists: userExists,
        emailFromAddress: env.EMAIL_FROM_ADDRESS,
        aletheiaCloudRegion: env.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION,
      }),
    );

    await mailer.sendMail({
      to,
      from: `Aletheia <${env.EMAIL_FROM_ADDRESS}>`,
      subject: `${inviterName} invited you to join the "${orgName}" organization on Aletheia`,
      html: htmlTemplate,
    });
  } catch (error) {
    logger.error(error);
  }
};
