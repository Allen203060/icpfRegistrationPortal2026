import pandas as pd
import random

def allocate_rooms(data, male_rooms, female_rooms):
    # Split data by gender, regardless of staying status
    male_data = data[data['Gender'].str.lower() == 'male']
    female_data = data[data['Gender'].str.lower() == 'female']

    # Calculate minimum rows per room and any extras
    male_rows_per_room = len(male_data) // male_rooms
    female_rows_per_room = len(female_data) // female_rooms
    male_extras = len(male_data) % male_rooms
    female_extras = len(female_data) % female_rooms

    # Initialize room lists
    male_rooms_list = [pd.DataFrame(columns=data.columns) for _ in range(male_rooms)]
    female_rooms_list = [pd.DataFrame(columns=data.columns) for _ in range(female_rooms)]

    # Distribute male data into rooms
    male_data = male_data.sample(frac=1).reset_index(drop=True)  # Shuffle male data
    index = 0
    for i in range(male_rooms):
        room_size = male_rows_per_room + (1 if i < male_extras else 0)
        male_rooms_list[i] = male_data.iloc[index:index + room_size]
        index += room_size

    # Distribute female data into rooms
    female_data = female_data.sample(frac=1).reset_index(drop=True)  # Shuffle female data
    index = 0
    for i in range(female_rooms):
        room_size = female_rows_per_room + (1 if i < female_extras else 0)
        female_rooms_list[i] = female_data.iloc[index:index + room_size]
        index += room_size

    # Round-robin allocation of any remaining rows across all rooms
    combined_rooms = male_rooms_list + female_rooms_list
    room_count = len(combined_rooms)

    # Allocate remaining rows (if any) in a round-robin fashion across all rooms
    remaining_data = data.loc[~data.index.isin(male_data.index) & ~data.index.isin(female_data.index)]
    for idx, row in remaining_data.iterrows():
        room_index = idx % room_count
        combined_rooms[room_index] = pd.concat([combined_rooms[room_index], row.to_frame().T], ignore_index=True)

    return male_rooms_list, female_rooms_list

# Load the data
file_path = "your_excel_file.xlsx"  # Replace with your file path
data = pd.read_excel(file_path, sheet_name="Outsiders")

# Take user input for the number of rooms for boys (m) and girls (f)
male_rooms = int(input("Enter the number of rooms for boys: "))
female_rooms = int(input("Enter the number of rooms for girls: "))

# Allocate rooms
male_rooms_data, female_rooms_data = allocate_rooms(data, male_rooms, female_rooms)

# Save the room allocations to an Excel file
output_path = "rooms_data.xlsx"
with pd.ExcelWriter(output_path) as writer:
    for i, room in enumerate(male_rooms_data):
        room.to_excel(writer, sheet_name=f"Male Room {i+1}", index=False)
    for i, room in enumerate(female_rooms_data):
        room.to_excel(writer, sheet_name=f"Female Room {i+1}", index=False)

print(f"Room allocations saved to {output_path}")
