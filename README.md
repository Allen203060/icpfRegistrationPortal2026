# ICPF ID Card

This project contains a set of scripts to generate ID cards grouped by various criteria and saved as PDFs. The process involves multiple steps, executed sequentially by a master script.

## Overview

The project consists of the following Python scripts:

1. **`script_groups.py`**: Processes group-related data.
2. **`script_rooms.py`**: Maps individuals to rooms based on their `S. No.`.
3. **`script_final.py`**: Merges the group and room data, creating a final dataset.
4. **`script_cards.py`**: Generates ID cards in PDF format using the final dataset.

A **`master_script.py`** automates the workflow by running these scripts in order.

---
