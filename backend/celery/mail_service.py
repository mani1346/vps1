import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import current_app # Import current_app

def send_email(to_address, subject, html_content):
    """
    Sends an email using the simple local SMTP server (MailHog).
    """
    
    # Get config from the Flask app
    SMTP_SERVER_HOST = current_app.config.get('MAIL_SERVER')
    SMTP_SERVER_PORT = current_app.config.get('MAIL_PORT')
    SENDER_EMAIL = current_app.config.get('MAIL_DEFAULT_SENDER')

    try:
        # Create the email message
        msg = MIMEMultipart()
        msg['To'] = to_address
        msg['Subject'] = subject
        msg['From'] = SENDER_EMAIL
        msg.attach(MIMEText(html_content, 'html'))

        # Connect to the SMTP server (NO LOGIN)
        with smtplib.SMTP(host=SMTP_SERVER_HOST, port=SMTP_SERVER_PORT) as client:
            client.send_message(msg)
        
        print(f"Email sent successfully to {to_address} (caught by MailHog)")

    except Exception as e:
        print(f"Error sending email to {to_address}: {e}")