import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";
import { Logger } from '@aws-lambda-powertools/logger';

export interface SendEmailParams {
    to: string;
    subject: string;
    htmlBody: string;
}

export class EmailService {
    private readonly logger = new Logger({ serviceName: 'EmailService' });
    private readonly sesClient = new SESClient({});

    constructor() {
        this.logger.info("EmailService initialized.");
    }

    getSenderEmail(): string {
        if (!process.env.SENDER_EMAIL_ADDRESS) {
            this.logger.error("SENDER_EMAIL_ADDRESS environment variable not set for EmailService.");
            // Decide if this is a fatal error for the service
            throw new Error("Configuration error: Sender email address missing for EmailService.");
        }
        return process.env.SENDER_EMAIL_ADDRESS;
    }
    /**
     * Sends an email using AWS SES.
     * @param params - Details of the email to send.
     */
    public async sendEmail(params: SendEmailParams): Promise<void> {
        const { to, subject, htmlBody } = params;
        this.logger.info("Preparing to send email via SES", { recipient: to, subject });

        const sendEmailParams: SendEmailCommandInput = {
            Source: this.getSenderEmail(),
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: subject, Charset: 'UTF-8' },
                Body: { Html: { Data: htmlBody, Charset: 'UTF-8' } },
            },
        };

        try {
            const command = new SendEmailCommand(sendEmailParams);
            await this.sesClient.send(command);
            this.logger.info("Email sent successfully via SES", { recipient: to, subject });
        } catch (error) {
            this.logger.error("Error sending email via SES", { error: error as Error, recipient: to, subject });
            // Re-throw the error to allow the caller to handle it
            throw new Error(`Failed to send email: ${(error as Error).message}`);
        }
    }
} 