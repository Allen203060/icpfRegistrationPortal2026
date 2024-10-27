import subprocess

# Function to run a script and handle errors
def run_script(script_name):
    try:
        print(f"Running {script_name}...")
        result = subprocess.run(["python", script_name], check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error while running {script_name}:")
        print(e.stderr)
        raise  # Re-raise the exception to stop further execution

def main():
    # List of scripts to run in order
    scripts = ["script_groups.py", "script_rooms.py", "script_final.py", "script_card.py"]

    # Run each script sequentially
    for script in scripts:
        run_script(script)

    print("All scripts ran successfully!")

# Run the main function
if __name__ == "__main__":
    main()
