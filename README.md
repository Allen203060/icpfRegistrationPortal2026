# ID Card Generation Workflow

This project contains a set of scripts to generate ID cards grouped by various criteria and saved as PDFs. The process involves multiple steps, executed sequentially by a master script.

## Overview

The project consists of the following Python scripts:

1. **`script_groups.py`**: Processes group-related data.
2. **`script_rooms.py`**: Maps individuals to rooms based on their `S. No.`.
3. **`script_final.py`**: Merges the group and room data, creating a final dataset.
4. **`script_cards.py`**: Generates ID cards in PDF format using the final dataset.

A **`master_script.py`** automates the workflow by running these scripts in order.

---

## Folder Structure

. ├── script_groups.py ├── script_rooms.py ├── script_final.py ├── script_cards.py ├── master_script.py ├── group_data.xlsx ├── rooms_data.xlsx ├── id_cards/ # Output directory for the PDFs └── README.md

yaml
Copy code

---

## Prerequisites

- Python 3.x installed on your machine
- The following libraries must be installed:
  ```bash
  pip install pandas reportlab
Scripts Overview
1. script_groups.py
Processes group-related data from group_data.xlsx and prepares the dataset for further processing.

2. script_rooms.py
Assigns room names to individuals using their S. No. from rooms_data.xlsx. Each room corresponds to a sheet in rooms_data.xlsx.

3. script_final.py
Merges the group and room data, ensuring that all individuals are assigned a room and group correctly.

4. script_cards.py
Generates ID cards in PDF format for each group. Each PDF contains multiple ID cards organized by group and room.

Master Script: master_script.py
The master_script.py automates the entire process by running all scripts in the correct order. If any script encounters an error, the process stops, and the error is displayed.

Usage
Run the master script from the terminal:

bash
Copy code
python master_script.py
Example Output
sql
Copy code
Running script_groups.py...
<Output from script_groups.py>

Running script_rooms.py...
<Output from script_rooms.py>

Running script_final.py...
<Output from script_final.py>

Running script_cards.py...
<Output from script_cards.py>

All scripts ran successfully!
Error Handling
If any script fails, the master script will:

Display the error message from the failed script.
Stop further execution to prevent incorrect data processing.
How the Room Assignment Works
Group Data: Each sheet in group_data.xlsx corresponds to a specific group.
Room Data: The room name is derived from the sheet name in rooms_data.xlsx.
Room Assignment Logic: For each individual in group_data.xlsx, the room name is determined by matching their S. No. with the appropriate room sheet in rooms_data.xlsx.
Output
The generated PDFs are saved in the id_cards/ folder.
Each PDF is named after the group and contains the ID cards of individuals assigned to that group.
License
This project is licensed under the MIT License - see the LICENSE file for details.

Contributing
Fork the repository.
Create a new branch (git checkout -b feature-branch).
Commit your changes (git commit -am 'Add new feature').
Push the branch (git push origin feature-branch).
Open a Pull Request.
Acknowledgments
Pandas: For data processing.
ReportLab: For PDF generation.
Special thanks to everyone who contributed to the development of this workflow.