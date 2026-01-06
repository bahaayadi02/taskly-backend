import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * Generate a 6-digit verification code
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send email verification code
   */
  async sendEmailVerificationCode(email: string, code: string, fullName: string): Promise<void> {
    const subject = 'Verify Your Email - Taskly';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Taskly</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 10px;
          }
          .verification-code {
            background: #f8f9fa;
            border: 2px dashed #2196F3;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            color: #2196F3;
            letter-spacing: 8px;
            margin: 10px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
            text-align: center;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #2196F3;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Taskly</div>
            <h1>Verify Your Email Address</h1>
          </div>
          
          <p>Hello <strong>${fullName}</strong>,</p>
          
          <p>Thank you for signing up for Taskly! To complete your registration, please verify your email address using the verification code below:</p>
          
          <div class="verification-code">
            <p><strong>Your Verification Code:</strong></p>
            <div class="code">${code}</div>
            <p><small>This code will expire in 10 minutes</small></p>
          </div>
          
          <p>Enter this code in the Taskly app to verify your email address and activate your account.</p>
          
          <p>If you didn't create an account with Taskly, please ignore this email.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Taskly Team</p>
            <p><small>This is an automated email. Please do not reply to this message.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.mailerService.sendMail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send password reset verification code
   */
  async sendPasswordResetCode(email: string, code: string, fullName: string): Promise<void> {
    const subject = 'Reset Your Password - Taskly';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Taskly</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 10px;
          }
          .verification-code {
            background: #fff3cd;
            border: 2px dashed #ffc107;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            color: #856404;
            letter-spacing: 8px;
            margin: 10px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
            text-align: center;
          }
          .warning {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Taskly</div>
            <h1>Reset Your Password</h1>
          </div>
          
          <p>Hello <strong>${fullName}</strong>,</p>
          
          <p>We received a request to reset your password for your Taskly account. Use the verification code below to proceed with resetting your password:</p>
          
          <div class="verification-code">
            <p><strong>Your Password Reset Code:</strong></p>
            <div class="code">${code}</div>
            <p><small>This code will expire in 10 minutes</small></p>
          </div>
          
          <div class="warning">
            <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your account remains secure.
          </div>
          
          <p>Enter this code in the Taskly app to create a new password for your account.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Taskly Team</p>
            <p><small>This is an automated email. Please do not reply to this message.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.mailerService.sendMail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, fullName: string, role: string): Promise<void> {
    const subject = 'Welcome to Taskly!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Taskly</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 10px;
          }
          .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Taskly</div>
            <h1>Welcome to Taskly!</h1>
          </div>
          
          <div class="success">
            <h2>🎉 Account Verified Successfully!</h2>
          </div>
          
          <p>Hello <strong>${fullName}</strong>,</p>
          
          <p>Congratulations! Your email has been successfully verified and your Taskly account is now active.</p>
          
          <p>As a <strong>${role}</strong>, you can now:</p>
          <ul>
            ${role === 'customer' ? `
              <li>Browse and book services</li>
              <li>Manage your bookings</li>
              <li>Rate and review service providers</li>
              <li>Track your service history</li>
            ` : `
              <li>Create and manage your service offerings</li>
              <li>Accept and complete jobs</li>
              <li>Build your reputation</li>
              <li>Grow your business</li>
            `}
          </ul>
          
          <p>Thank you for joining our community. We're excited to have you on board!</p>
          
          <div class="footer">
            <p>Best regards,<br>The Taskly Team</p>
            <p><small>Need help? Contact our support team anytime.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.mailerService.sendMail({
      to: email,
      subject,
      html,
    });
  }
}


