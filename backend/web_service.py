from flask_cors import CORS
from flask import Flask, request, render_template, url_for, after_this_request, g, has_app_context
from werkzeug.utils import secure_filename
import os
import subprocess
import shutil
from dotenv import load_dotenv
import requests
import time
import threading
import uuid
import logging
from logging.handlers import RotatingFileHandler

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

# Configure logging
log_file = os.environ.get('LOG_FILE', 'app.log')
log_level_str = os.environ.get('LOG_LEVEL', 'INFO')
log_level = getattr(logging, log_level_str.upper(), logging.INFO)
log_format = os.environ.get('LOG_FORMAT', '%(asctime)s - User ID: %(user_id)s - %(name)s - %(levelname)s - %(message)s')

class UserIDFilter(logging.Filter):
    def filter(self, record):
        if has_app_context():
            record.user_id = getattr(g, 'user_id', 'N/A')
        else:
            record.user_id = 'N/A'
        return True

handler = RotatingFileHandler(log_file, maxBytes=10000, backupCount=3)
formatter = logging.Formatter(log_format)
handler.setFormatter(formatter)
handler.addFilter(UserIDFilter())
logger = logging.getLogger(__name__)
logger.setLevel(log_level)
logger.addHandler(handler)


# Server Configuration
app.config['UPLOAD_FOLDER'] = os.path.abspath(os.environ.get('UPLOAD_FOLDER', '../../allosmod_inputs/uploads'))
app.config['TEMPLATE_FOLDER'] = os.environ.get('TEMPLATE_FOLDER', './templates')
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # Default 16MB

# Email Configuration
SMTP_SERVER = os.environ.get('SMTP_SERVER')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
EMAIL_FROM = os.environ.get('EMAIL_FROM', SMTP_USER)
EMAIL_SUBJECT = os.environ.get('EMAIL_SUBJECT', 'Your job has been processed')

# AllosMod Script Path
ALLOSMOD_SCRIPT_PATH = os.path.abspath(os.environ.get('ALLOSMOD_SCRIPT_PATH', '../../allosmod_inputs/run_allosmod_lib.sh'))

# Scratch and Logs Directories
SCRATCH_DIR = os.environ.get('SCRATCH_DIR', '/scratch/rajagopalmohanraj.n')
LOGS_DIR = os.environ.get('LOGS_DIR', os.path.join(SCRATCH_DIR, 'allosmod_inputs/logs'))

# File.io API URL
FILEIO_API_URL = os.environ.get('FILEIO_API_URL', 'https://file.io/')

def ensure_directory_structure():
    """Ensure all required directories exist."""
    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    logger.info(f"Ensuring upload directory exists: {app.config['UPLOAD_FOLDER']}")
    
    # Ensure logs directory exists
    os.makedirs(LOGS_DIR, exist_ok=True)
    logger.info(f"Ensuring logs directory exists: {LOGS_DIR}")
    
    # Create a test file to verify permissions
    try:
        test_file_path = os.path.join(app.config['UPLOAD_FOLDER'], '.test_write_permissions')
        with open(test_file_path, 'w') as f:
            f.write('Testing write permissions')
        os.remove(test_file_path)
        logger.info("Write permissions verified for upload directory")
    except Exception as e:
        logger.error(f"Failed to write to upload directory: {e}")
        raise

@app.before_request
def before_request():
    g.user_id = str(uuid.uuid4())

# Setup function to run before first request
with app.app_context():
    # Run setup tasks
    ensure_directory_structure()
    logger.info("Application setup complete")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if request.method == 'POST':
        email = request.form['email']
        name = request.form['name']
        organization = request.form.get('organization', '')
        description = request.form.get('description', '')
        number_of_runs = request.form.get('numberOfRuns', '1')
        
        logger.info(f"File upload initiated for user: {name}, email: {email}, organization: {organization}")
        logger.info(f"Description: {description}, Number of Runs: {number_of_runs}")

        if 'zipfiles' not in request.files:
            logger.error("No file part in the request")
            return 'No file part', 400

        files = request.files.getlist('zipfiles')

        if len(files) == 0:
            logger.error("No selected files")
            return 'No selected files', 400

        if len(files) > 10:
            logger.error("Too many files uploaded")
            return 'Too many files. Please upload up to 10 ZIP files.', 400

        # Create user directory with timestamp and user info
        timestamp = time.strftime('%Y%m%d%H%M%S')
        user_dir_name = f"{timestamp}_{secure_filename(name)}_{g.user_id[:8]}"
        user_dir = os.path.join(app.config['UPLOAD_FOLDER'], user_dir_name)
        os.makedirs(user_dir, exist_ok=True)
        
        # Save user metadata
        with open(os.path.join(user_dir, 'user_info.txt'), 'w') as f:
            f.write(f"Name: {name}\n")
            f.write(f"Email: {email}\n")
            f.write(f"Organization: {organization}\n")
            f.write(f"Description: {description}\n")
            f.write(f"Number of Runs: {number_of_runs}\n")
            f.write(f"User ID: {g.user_id}\n")
            f.write(f"Timestamp: {timestamp}\n")

        job_ids = []
        saved_files = []
        
        for file in files:
            # Accept various formats - we'll handle extraction differently based on type
            if file:
                filename = secure_filename(file.filename)
                file_path = os.path.join(user_dir, filename)
                file.save(file_path)
                saved_files.append(filename)
                logger.info(f"File saved: {file_path}")

                # Process file and prepare for allosmod
                try:
                    # Process the uploaded file and update input.dat with number_of_runs
                    job_id = process_uploaded_file(file_path, email, name, number_of_runs, user_dir)
                    if job_id:
                        job_ids.append(job_id)
                except Exception as e:
                    logger.exception(f"Error processing file {filename}: {e}")
                    return f"Error processing file {filename}: {str(e)}", 500
            else:
                logger.error("Empty file uploaded")
                return 'Empty file uploaded', 400

        # Return success response
        response_data = {
            'status': 'success',
            'message': 'Files uploaded and processing started',
            'email': email,
            'name': name,
            'files': saved_files,
            'job_ids': job_ids,
            'user_id': g.user_id
        }
        
        return response_data

def process_uploaded_file(file_path, email, name, number_of_runs, user_dir):
    logger.info(f"Processing uploaded file: {file_path}")
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    file_ext = os.path.splitext(file_path)[1].lower()
    
    # Create a subdirectory for this specific file
    extract_dir = os.path.join(user_dir, file_name)
    os.makedirs(extract_dir, exist_ok=True)
    
    # Extract the file based on its extension
    if file_ext == '.zip':
        logger.info(f"Extracting ZIP file: {file_path}")
        subprocess.run(['unzip', '-o', file_path, '-d', extract_dir])
    elif file_ext in ['.tar', '.gz', '.tgz']:
        logger.info(f"Extracting TAR/GZ file: {file_path}")
        subprocess.run(['tar', '-xf', file_path, '-C', extract_dir])
    else:
        # For other file types (like PDB files), just copy them to the extract directory
        logger.info(f"Copying file to directory: {file_path}")
        # For PDB files or other individual files, create necessary structure
        os.makedirs(os.path.join(extract_dir, 'input'), exist_ok=True)
        shutil.copy(file_path, os.path.join(extract_dir, 'input'))
        # Create basic input.dat file if it doesn't exist
        input_dat_path = os.path.join(extract_dir, 'input.dat')
        if not os.path.exists(input_dat_path):
            with open(input_dat_path, 'w') as f:
                f.write(f"NRUNS={number_of_runs}\n")
                f.write("DEVIATION=4.0\n")
                f.write("COARSE=false\n")
                f.write("SAMPLING=simulation\n")
                f.write("TEMPERATURE=300.0\n")
    
    logger.info(f"File processed in directory: {extract_dir}")
    
    # Check for input.dat and update NRUNS parameter if needed
    input_dat_path = os.path.join(extract_dir, 'input.dat')
    if os.path.exists(input_dat_path):
        # Read the current content
        with open(input_dat_path, 'r') as f:
            lines = f.readlines()
        
        # Update or add NRUNS parameter
        nruns_updated = False
        for i, line in enumerate(lines):
            if line.startswith('NRUNS='):
                lines[i] = f"NRUNS={number_of_runs}\n"
                nruns_updated = True
                break
        
        if not nruns_updated:
            lines.append(f"NRUNS={number_of_runs}\n")
        
        # Write back the updated content
        with open(input_dat_path, 'w') as f:
            f.writelines(lines)
        
        logger.info(f"Updated input.dat with NRUNS={number_of_runs}")
    else:
        logger.warning(f"No input.dat found in {extract_dir}")
    
    # Find the path to the allosmod script
    if not os.path.exists(ALLOSMOD_SCRIPT_PATH):
        logger.error(f"Allosmod script not found at: {ALLOSMOD_SCRIPT_PATH}")
        # Try alternate location from SCRATCH_DIR
        alt_script_path = os.path.join(SCRATCH_DIR, 'allosmod_inputs/run_allosmod_lib.sh')
        if os.path.exists(alt_script_path):
            logger.info(f"Using alternate script path: {alt_script_path}")
            allosmod_script_path = alt_script_path
        else:
            raise FileNotFoundError(f"Could not find run_allosmod_lib.sh script")
    else:
        allosmod_script_path = ALLOSMOD_SCRIPT_PATH
    
    logger.info(f"Using allosmod script at: {allosmod_script_path}")
    
    # Submit the job to SLURM
    slurm_command = f"sbatch --parsable {allosmod_script_path} {extract_dir} {g.user_id} {email} {name}"
    try:
        logger.info(f"Executing command: {slurm_command}")
        job_id = subprocess.check_output(slurm_command, shell=True).decode().strip()
        logger.info(f"Allosmod-Lib Job submitted with ID: {job_id}")
        return job_id
    except subprocess.CalledProcessError as e:
        logger.error(f"Error submitting job: {e}, Output: {e.output.decode() if hasattr(e, 'output') else 'No output'}")
        raise RuntimeError(f"Failed to submit job to SLURM: {str(e)}")


def is_job_running(job):
    command = f"squeue | grep {job}"
    logger.debug(f'Checking job status with command: {command}')
    try:
        output = subprocess.check_output(command, shell=True).decode().strip()
        is_running = len(output) > 0
        logger.info(f"Job {job} status: {'running' if is_running else 'completed'}")
        return is_running
    except subprocess.CalledProcessError:
        logger.info(f"Job {job} not found, assuming completed")
        return False

def monitor_job(job_id, user_id, email, name, file_path):
    logs_dir = os.path.join(LOGS_DIR, user_id)
    os.makedirs(logs_dir, exist_ok=True)
    log_file_path = os.path.join(logs_dir, f"monitor_{job_id}.log")
    
    with open(log_file_path, 'w') as log_file:
        log_file.write(f"Starting job monitoring for job_id: {job_id}\n")

    logger.info(f"Starting job monitoring for job_id: {job_id}")
    while is_job_running(job_id):
        logger.debug(f"Job for job_id {job_id} still running, checking again in 5 seconds")
        time.sleep(5)
    logger.info(f"Job completed for job_id: {job_id}")

    logger.info(f"Starting job monitoring for user_id: {user_id}")
    while is_job_running(f'qsub-{user_id[:3]}'):
        logger.debug(f"Job for user_id {user_id} still running, checking again in 60 seconds")
        time.sleep(60)
    logger.info(f"Job completed for user_id: {user_id}")

    zip_file_path = zip_results(file_path)
    download_link = upload_to_fileio(zip_file_path)
    send_email(email, download_link, name, job_id)
    logger.info(f"Results processed and email sent for user_id: {user_id}")

def zip_results(file_path):
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    result_dir = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    zip_file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_name}_results.zip")
    shutil.make_archive(zip_file_path[:-4], 'zip', result_dir)
    logger.info(f"Results zipped: {zip_file_path}")
    return zip_file_path

def upload_to_fileio(file_path):
    url = FILEIO_API_URL
    try:
        with open(file_path, 'rb') as file:
            response = requests.post(url, files={'file': file})
        if response.status_code == 200:
            data = response.json()
            link = data.get('link', None)
            logger.info(f"File uploaded to file.io: {link}")
            return link
        else:
            logger.error(f"Failed to upload file to file.io. Status code: {response.status_code}")
            return None
    except Exception as e:
        logger.exception(f"Error uploading file to file.io: {e}")
        return None

def send_email(email, download_link, name, job_id):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    msg = MIMEMultipart()
    msg['From'] = EMAIL_FROM
    msg['To'] = email
    msg['Subject'] = EMAIL_SUBJECT

    # Add link to results page with 3D visualization
    results_page_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/results?jobId={job_id}&resultUrl={download_link}"
    
    body = f"""Hello {name},

Your file has been successfully processed. 

You can download it directly using this link:
{download_link}

Or view your results with our interactive 3D protein viewer:
{results_page_url}

Best regards,
SimBioSys Lab, Northeastern University"""
    msg.attach(MIMEText(body, 'plain'))

    try:
        if SMTP_SERVER and SMTP_USER and SMTP_PASSWORD:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(EMAIL_FROM, email, msg.as_string())
            logger.info(f"Email sent successfully to {email}")
        else:
            logger.warning(f"Email not sent to {email} - SMTP settings not configured")
    except Exception as e:
        logger.exception(f"Failed to send email to {email}: {e}")

if __name__ == "__main__":
    # Ensure directories exist before starting the server
    ensure_directory_structure()
    
    logger.info(f"Application started with UPLOAD_FOLDER: {app.config['UPLOAD_FOLDER']}")
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 't')
    logger.info(f"Starting server on {host}:{port} with debug={debug}")
    app.run(host=host, port=port, debug=debug)
