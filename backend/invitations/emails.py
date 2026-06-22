import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

def send_invitation_email(invitation):
    """
    Sends an invitation email to the whitelisted email address.
    Directs the user to the appropriate login page (Hub or Learn) depending on their role.
    """
    role = invitation.role  # 'STUDENT', 'MENTOR', 'TUTOR', 'ADMIN'
    email = invitation.email
    
    role_labels = {
        'STUDENT': 'Student',
        'MENTOR': 'Mentor',
        'TUTOR': 'Tutor',
        'ADMIN': 'Admin'
    }
    role_label = role_labels.get(role, 'User')
    
    # Determine target base URL from settings depending on role
    if role == 'STUDENT':
        target_base = getattr(settings, 'LEARN_URL', 'http://localhost:3001')
    else:
        target_base = getattr(settings, 'HUB_URL', 'http://localhost:3000')
        
    invitation_link = f"{target_base}/login?email={email}"
    subject = f"Invitation to join Eduport Plus as a {role_label}"
    
    # Premium styled HTML template
    html_message = f"""
    <html>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f9fafb; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700; letter-tight: -0.025em;">Eduport Plus</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">Unified Learning Dashboard</p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 24px;" />
          
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hello,</p>
          <p style="font-size: 16px; margin: 0 0 24px 0;">You have been whitelisted and invited to join the Eduport Plus platform as a <strong>{role_label}</strong>.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{invitation_link}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.15); transition: background-color 0.2s;">Accept Invitation</a>
          </div>
          
          <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0 0; line-height: 1.5;">
            If the button above does not work, copy and paste the link below into your web browser:
            <br />
            <a href="{invitation_link}" style="color: #4f46e5; word-break: break-all;">{invitation_link}</a>
          </p>
          
          <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 32px 0 20px 0;" />
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
            This email was sent to {email}. If you were not expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
    """
    
    # Plain text version for fallback
    plain_message = f"""Welcome to Eduport Plus!

Hello,

You have been whitelisted and invited to join the Eduport Plus platform as a {role_label}.

To get started, please accept your invitation by visiting the following link in your browser:
{invitation_link}

This invitation was sent to {email}. If you were not expecting this, please ignore this email.
"""

    logger.info(f"Sending invitation email to {email} with role {role_label}")
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        html_message=html_message,
        fail_silently=False,
    )
