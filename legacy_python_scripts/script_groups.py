import pandas as pd
import random

def split_data_into_sheets(data, group_names):
    # Extract columns
    age_column = "Age"
    church_column = "Church"
    location_column = "Location"

    # Shuffle the data to randomize the distribution
    data = data.sample(frac=1).reset_index(drop=True)

    # Number of groups determined by the lines in `groups.txt`
    n = len(group_names)

    # Create empty DataFrames for each group
    groups = [pd.DataFrame(columns=data.columns) for _ in range(n)]

    # Helper function to determine if a row can be added to a particular sheet
    def can_add_to_group(group, row):
        key = row[church_column] if pd.notna(row[church_column]) else row[location_column]
        if key in group[church_column].values or key in group[location_column].values:
            return False
        return True

    # Distribute rows among the groups
    index = 0
    for _, row in data.iterrows():
        added = False
        for i in range(n):
            group = groups[(index + i) % n]
            if can_add_to_group(group, row):
                group.loc[len(group)] = row
                added = True
                break
        if not added:
            groups[index % n].loc[len(groups[index % n])] = row
        index += 1

    # Ensure equal row distribution
    total_rows = len(data)
    min_rows_per_group = total_rows // n
    extra_rows = total_rows % n

    # Balance groups
    all_data = pd.concat(groups)
    balanced_groups = [all_data.iloc[i * min_rows_per_group:(i + 1) * min_rows_per_group].copy() for i in range(n)]
    if extra_rows > 0:
        extra_data = all_data.iloc[-extra_rows:].copy()
        for i in range(extra_rows):
            balanced_groups[i] = pd.concat([balanced_groups[i], extra_data.iloc[[i]]])

    return balanced_groups, group_names

# Load the data
file_path = "your_excel_file.xlsx"  # Replace with your file path
data = pd.read_excel(file_path, sheet_name="Outsiders")

# Read group names from `groups.txt`
with open("groups.txt", "r") as file:
    group_names = [line.strip() for line in file.readlines()]

# Split the data
groups, group_names = split_data_into_sheets(data, group_names)

# Save the results to a new Excel file
output_path = "group_data.xlsx"
with pd.ExcelWriter(output_path) as writer:
    for i, group in enumerate(groups):
        group.to_excel(writer, sheet_name=group_names[i], index=False)

print(f"Data split into {len(group_names)} groups, saved to {output_path}")
