import logging
import gspread
from django.conf import settings
from google.oauth2.service_account import Credentials

logger = logging.getLogger(__name__)

class GoogleSheetsService:
    @staticmethod
    def get_gspread_client():
        """
        Initializes and returns a gspread client using separate environment credentials.
        """
        email = getattr(settings, 'GOOGLE_SERVICE_ACCOUNT_EMAIL', '')
        private_key = getattr(settings, 'GOOGLE_PRIVATE_KEY', '')

        if not email or not private_key:
            raise ValueError(
                "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must be configured in settings."
            )

        scopes = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]

        # Format key properly (handling escaped newlines in env variables)
        formatted_private_key = private_key.replace('\\n', '\n')

        info = {
            "type": "service_account",
            "private_key": formatted_private_key,
            "client_email": email,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        }

        try:
            credentials = Credentials.from_service_account_info(info, scopes=scopes)
            client = gspread.authorize(credentials)
            return client
        except Exception as e:
            logger.error(f"Failed to authenticate with Google Sheets: {e}")
            raise

    @classmethod
    def lookup_student_by_code(cls, student_code: str) -> dict:
        """
        Queries Google Sheets ('enrollment data' tab, A3:AB range) for matching student code.
        Replicates the findStudentByCode logic with exact production index mapping.
        """
        sheet_id = settings.GOOGLE_SHEET_ID
        if not sheet_id:
            raise ValueError("GOOGLE_SHEET_ID is not configured in settings.")

        logger.info(f"Initiating production-matched Sheets lookup for student_code: {student_code}")
        try:
            client = cls.get_gspread_client()
            spreadsheet = client.open_by_key(sheet_id)
            worksheet = spreadsheet.worksheet('enrollment data')
            # Fetch the cell value range directly to match the range A3:AB
            rows = worksheet.get('A3:AB')
        except Exception as e:
            logger.error(f"Error accessing worksheet 'enrollment data' for sheet '{sheet_id}': {e}")
            raise

        target_code = str(student_code).strip().lower()

        # Helper to get value at index safely
        def get_val(row, idx):
            if len(row) > idx:
                return str(row[idx]).strip()
            return ""

        for row in rows:
            # AB is index 27 (0-indexed column AB where A=0, B=1, ... Z=25, AA=26, AB=27)
            row_student_code = get_val(row, 27)
            if row_student_code.strip().lower() == target_code:
                # Match found! Map variables exactly to production specs
                return {
                    "student_code": row_student_code,
                    "full_name": get_val(row, 1),        # B
                    "mobile_number": get_val(row, 2),    # C
                    "email": get_val(row, 3),            # D
                    "country": get_val(row, 5),          # F
                    "state": get_val(row, 6),            # G
                    "school_name": get_val(row, 7),      # H
                    "grade": get_val(row, 8),            # I
                    "syllabus": get_val(row, 9),         # J
                    "admission_date": get_val(row, 10),  # K
                    "tutor_name": get_val(row, 21),      # V
                    "remarks": get_val(row, 25),         # Z
                }

        logger.warning(f"Student code '{student_code}' not found in 'enrollment data' worksheet range A3:AB.")
        return None


