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

# Create an 'id_cards' directory if it doesn't exist
output_folder = "id_cards"
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# Function to wrap text if it exceeds max characters
def conditional_wrap_text(c, text, max_width, x, y, line_height=10, max_chars=20):
    if pd.isna(text):
        text = ""
    words = text.split()
    line = ""
    for word in words:
        if len(line + " " + word) <= max_chars:
            line += " " + word
        else:
            c.drawString(x, y, line.strip())
            y -= line_height
            line = word
    if line:
        c.drawString(x, y, line.strip())

# Function to create an ID card
def create_id_card(c, name, church_or_location, group_name, room_name, x, y):
    c.setFillColor(colors.lightblue)
    c.rect(x, y, ID_CARD_WIDTH, ID_CARD_HEIGHT, fill=True, stroke=False)
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    c.rect(x, y, ID_CARD_WIDTH, ID_CARD_HEIGHT, fill=False, stroke=True)
    
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.black)
    max_text_width = ID_CARD_WIDTH - 10 * mm

    y_name = y + 40 * mm
    c.drawString(x + 5 * mm, y_name, "Name:")
    conditional_wrap_text(c, name, max_text_width, x + 25 * mm, y_name, max_chars=20)

    c.setFont("Helvetica", 10)
    y_church = y + 10 * mm
    c.drawString(x + 5 * mm, y_church, "Church/Location:")
    conditional_wrap_text(c, church_or_location, max_text_width, x + 33 * mm, y_church, max_chars=20)

    y_group = y + 20 * mm
    c.drawString(x + 5 * mm, y_group, "Group:")
    conditional_wrap_text(c, group_name, max_text_width, x + 25 * mm, y_group, max_chars=20)

    y_room = y + 30 * mm
    c.drawString(x + 5 * mm, y_room, "Room:")
    conditional_wrap_text(c, room_name, max_text_width, x + 25 * mm, y_room, max_chars=20)

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
        # Check if Church is present; if not, use Location
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
