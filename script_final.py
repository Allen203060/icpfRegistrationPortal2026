import pandas as pd

def create_final_data(main_file_path, group_file_path, rooms_file_path, output_file_path):
    # Load the main data sheet
    main_data = pd.read_excel(main_file_path, sheet_name="Outsiders")

    # Load group and room data
    group_data = pd.read_excel(group_file_path, sheet_name=None)  # Loads all sheets from group_data
    rooms_data = pd.read_excel(rooms_file_path, sheet_name=None)  # Loads all sheets from rooms_data

    # Initialize columns for group and room names
    main_data["Group Name"] = ""
    main_data["Room Name"] = ""

    # Assign group names from `group_data.xlsx` using "S. No." column
    for group_name, group_sheet in group_data.items():
        group_sno = group_sheet["S. No."]
        main_data.loc[main_data["S. No."].isin(group_sno), "Group Name"] = group_name

    # Assign room names from `rooms_data.xlsx` using "S. No." column
    for room_name, room_sheet in rooms_data.items():
        room_sno = room_sheet["S. No."]
        main_data.loc[main_data["S. No."].isin(room_sno), "Room Name"] = room_name

    # Save the updated main data to the final Excel file
    main_data.to_excel(output_file_path, sheet_name="Outsiders", index=False)
    print(f"Final data saved to {output_file_path}")

# Define file paths
main_file_path = "your_excel_file.xlsx"  # Replace with your main data file path
group_file_path = "group_data.xlsx"       # File from the first script
rooms_file_path = "rooms_data.xlsx"       # File from the second script
output_file_path = "final_data.xlsx"      # The output file with group and room names added

# Run the function
create_final_data(main_file_path, group_file_path, rooms_file_path, output_file_path)
