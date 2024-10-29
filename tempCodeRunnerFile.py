import os
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors

# Define ID card dimensions
ID_CARD_WIDTH = 85 * mm
ID_CARD_HEIGHT = 54 * mm
MARGIN_X = 10 * mm
MARGIN_Y = 15 * mm
GAP_X = 5 * mm
GAP_Y = 10 * mm

# Updated colors for each group (ensuring uniqueness)
GROUP_COLORS = {
    "A": colors.lightblue,
    "B": colors.lightcoral,
    "C": colors.lightgreen,
    "D": colors.lightgoldenrodyellow,
    "E": colors.thistle,
    "F": colors.lightpink,
    "G": colors.lightcyan,
    "H": colors.wheat,
    "I": colors.lavender,
    "O": colors.khaki
}

# Create an 'id_cards' directory if it doesn't exist
output_folder = "id_cards"
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# Function to abbreviate names with only middle names shortened
def abbreviate_name(name, max_length=20):
    if len(name) > max_length:
        parts = name.split()
        
        # If there are middle names, abbreviate them, keeping first and last names in full
        if len(parts) > 2:
            first_name, *middle_names, last_name = parts
            abbrev_middle = " ".join(f"{mn[0]}." for mn in middle_names)
            abbrev_name = f"{first_name} {abbrev_middle} {last_name}"
        else:
            # No middle names to abbreviate; truncate if still too long
            abbrev_name = name[:max_length - 3] + "..."
        
        # Ensure the name still fits within max length
        return abbrev_name if len(abbrev_name) <= max_length else abbrev_name[:max_length - 3] + "..."
    return name

# Function to center-align and wrap text if necessary
def draw_centered_wrapped_text(c, text, x_center, y, font_size=10, font_name="Helvetica-Bold", max_width=ID_CARD_WIDTH - 10 * mm):
    c.setFont(font_name, font_size)
    c.setFillColor(colors.black)
    
    # Split the text into lines to fit within max width
    words = text.split()
    line = ""
    lines = []
    
    for word in words:
        test_line = f"{line} {word}".strip()
        if c.stringWidth(test_line, font_name, font_size) <= max_width:
            line = test_line
        else:
            lines.append(line)
            line = word
    lines.append(line)  # Add the last line
    
    # Draw each line centered, updating the y-position for each line
    line_height = font_size + 2
    for i, line in enumerate(lines):
        text_width = c.stringWidth(line, font_name, font_size)
        x = x_center - text_width / 2
        c.drawString(x, y - i * line_height, line)

# Function to create an ID card
def create_id_card(c, name, church_or_location, group_name, room_name, x, y):
    # Set unique color for each group
    c.setFillColor(GROUP_COLORS.get(group_name, colors.lightblue))
    c.rect(x, y, ID_CARD_WIDTH, ID_CARD_HEIGHT, fill=True, stroke=False)
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    c.rect(x, y, ID_CARD_WIDTH, ID_CARD_HEIGHT, fill=False, stroke=True)
    
    # Center-aligned and bold name
    name = abbreviate_name(name)
    y_name = y + 40 * mm
    draw_centered_wrapped_text(c, f"Name: {name}", x + ID_CARD_WIDTH / 2, y_name, font_size=12)

    # Church or location with wrapping if needed
    y_church = y + 20 * mm
    draw_centered_wrapped_text(c, f"Church/Location: {church_or_location}", x + ID_CARD_WIDTH / 2, y_church, font_size=10)
    
    # Group and room
    y_group = y + 30 * mm
    draw_centered_wrapped_text(c, f"Group: {group_name}", x + ID_CARD_WIDTH / 2, y_group, font_size=10)

    y_room = y + 10 * mm
    draw_centered_wrapped_text(c, f"Room: {room_name}", x + ID_CARD_WIDTH / 2, y_room, font_size=10)

# Function to create ID cards PDF for each group
def create_id_cards_for_group(group_df, group_name, room_mapping):
    output_file = os.path.join(output_folder, f"{group_name}.pdf")
    c = canvas.Canvas(output_file, pagesize=A4)
    page_width, page_height = A4
    
    positions = [
        (MARGIN_X, page_height - MARGIN_Y - ID_CARD_HEIGHT),
        (MARGIN_X + ID_CARD_WIDTH + GAP_X, page_height - MARGIN_Y - ID_CARD_HEIGHT),
        (MARGIN_X, page_height - MARGIN_Y - 2 * ID_CARD_HEIGHT - GAP_Y),
        (MARGIN_X + ID_CARD_WIDTH + GAP_X, page_height - MARGIN_Y - 2 * ID_CARD_HEIGHT - GAP_Y),
        (MARGIN_X, page_height - MARGIN_Y - 3 * ID_CARD_HEIGHT - 2 * GAP_Y),
        (MARGIN_X + ID_CARD_WIDTH + GAP_X, page_height - MARGIN_Y - 3 * ID_CARD_HEIGHT - 2 * GAP_Y)
    ]

    card_count = 0
    for _, row in group_df.iterrows():
        name = row.get("Name", "N/A")
        church_or_location = row["Church"] if pd.notna(row.get("Church")) else row.get("Location", "N/A")
        room_name = room_mapping.get(row.get("S. No."), "N/A")
        
        x, y = positions[card_count % 6]
        create_id_card(c, name, church_or_location, group_name, room_name, x, y)
        
        card_count += 1
        if card_count % 6 == 0:
            c.showPage()
    
    if card_count % 6 != 0:
        c.showPage()
    c.save()
    print(f"ID cards for group '{group_name}' saved to {output_file}")

def main():
    # Load data from group_data.xlsx and rooms_data.xlsx
    group_data = pd.ExcelFile("group_data.xlsx")
    room_data = pd.ExcelFile("rooms_data.xlsx")
    
    # Create a dictionary to map "S. No." to "Room Name" based on the sheets
    room_mapping = {}
    for sheet_name in room_data.sheet_names:
        room_sheet_df = room_data.parse(sheet_name)
        for _, row in room_sheet_df.iterrows():
            serial_no = row.get("S. No.")
            if pd.notna(serial_no):
                room_mapping[serial_no] = sheet_name  # Use sheet name as room name
    
    # Process each sheet in group_data.xlsx
    for group_name in group_data.sheet_names:
        group_df = group_data.parse(group_name)
        create_id_cards_for_group(group_df, group_name, room_mapping)

# Run the main function
if __name__ == "__main__":
    main()
