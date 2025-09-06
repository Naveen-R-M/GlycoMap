import os
import argparse
import requests

def upload_file(filepath, url='https://file.io'):
    """Uploads a single file to file.io."""
    try:
        with open(filepath, 'rb') as f:
            response = requests.post(url, files={'file': f})
            response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
            return response.json()['link']
    except requests.exceptions.RequestException as e:
        print(f"Error uploading {filepath}: {e}")
        return None
    except (KeyError, TypeError):
        print(f"Error parsing response for {filepath}")
        return None

def upload_folder(folder_path):
    """Recursively uploads a folder and its contents."""
    uploaded_files = {}
    for root, _, files in os.walk(folder_path):
        for filename in files:
            if filename.endswith('_results.zip'):
                filepath = os.path.join(root, filename)
                upload_url = upload_file(filepath)
                if upload_url:
                    uploaded_files[filename] = upload_url
    return uploaded_files

# Example Usage
parser = argparse.ArgumentParser(description="Process results and send email.")
parser.add_argument("folder_path", help="Path to the folder to upload.")
args = parser.parse_args()
folder_to_upload = args.folder_path
uploaded = upload_folder(folder_to_upload)

if uploaded:
    print("Uploaded files:")
    for filename, url in uploaded.items():
        print(f"- {filename}: {url}")
else:
    print("No files were uploaded.")
