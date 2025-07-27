# FileService/debug_token.py

import os
from jose import jwt, JWTError
from dotenv import load_dotenv
import json

# --- PASTE YOUR TOKEN HERE ---
# Get this from the "EXTRACTED ID TOKEN" log in your browser's developer console
# (Note: it's mislabeled as ID token, but it's our accessToken)
TOKEN_FROM_BROWSER = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..zXd78xizBIFF4kJ3.G49V3oAdSm8JFAvXMlIG_KTWwALamfiVhajGcP76gPGH0LtD1olfhblrx7Dbn1H3cXUHWl5iVT5YkiJdMWK1PyjZfsgCcWf8V93BNgJr2IL7BUpoI_rsfdk0g-jos9pi6UF--bacHkGtmdmrfO8-5nSM0qJ-tzBzX9dVRhSpD-x93GOIj0FKzDJAor3SrFDNrh531eUEWrrb9ECRMHhidZCyEeCIQuh3_xO7-gUW2t4.UQ12ImcrfzWdF9IH0RaCnA"
# -----------------------------

def debug_token():
    """
    Attempts to decode the provided token using the FileService's secret.
    """
    try:
        # Load the same environment variables as your FileService
        load_dotenv(dotenv_path='.env')
        
        secret = os.getenv("NEXTAUTH_SECRET")
        if not secret:
            print("ERROR: NEXTAUTH_SECRET not found in your FileService/.env file.")
            return

        print("--- Attempting to decode token ---")
        
        # Use the same decoding logic as your security.py
        payload = jwt.decode(
            TOKEN_FROM_BROWSER,
            secret,
            algorithms=["HS256"]
        )
        
        print("\n✅ SUCCESS: Token was decoded successfully!")
        print("\n--- Decoded Payload ---")
        print(json.dumps(payload, indent=2))
        
        user_id = payload.get("sub")
        print(f"\n--- User ID (sub claim) ---")
        print(user_id)
        
        if user_id:
            print("\nCONCLUSION: The secret is correct and the user ID is present. The issue may be elsewhere.")
        else:
            print("\nCONCLUSION: The secret is correct, but the 'sub' claim with the user ID is missing from the token.")

    except JWTError as e:
        print(f"\n❌ FAILED: Token could not be decoded.")
        print(f"--- JWT Error ---")
        print(e)
        print("\nCONCLUSION: This almost always means your NEXTAUTH_SECRET in FileService/.env does not match the one in FrontEnd/.env.local.")
    
    except Exception as e:
        print(f"\n❌ An unexpected error occurred: {e}")

if __name__ == "__main__":
    debug_token()