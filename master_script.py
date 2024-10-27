import subprocess

# Function to run a script and handle errors
def run_script(script_name, interactive=False):
    try:
        print(f"Running {script_name}...")

        # Use 'interactive=True' to allow user input during the script's execution
        if interactive:
            result = subprocess.run(["python", script_name], check=True)
        else:
            result = subprocess.run(["python", script_name], check=True, capture_output=True, text=True)
            print(result.stdout)

    except subprocess.CalledProcessError as e:
        print(f"Error while running {script_name}:")
        if e.stderr:
            print(e.stderr)
        raise  # Stop further execution if any script fails

def main():
    # List of scripts to run in order
    scripts = [
        {"name": "script_groups.py", "interactive": False},
        {"name": "script_rooms.py", "interactive": True},  # Needs user input
        {"name": "script_final.py", "interactive": False},
        {"name": "script_cards.py", "interactive": False}
    ]

    # Run each script sequentially
    for script in scripts:
        run_script(script["name"], script["interactive"])

    print("All scripts ran successfully!")

# Run the main function
if __name__ == "__main__":
    main()
