import re

def find_missing_entries():
    """
    Compares the original markdown file with the cleaned version to find
    which entries were not processed.
    """
    original_file = 'manhattan_prep_1000_gre_words.md'
    cleaned_file = 'cleaned_vocabulary.md'

    try:
        with open(original_file, 'r', encoding='utf-8') as f:
            original_lines = f.readlines()
        with open(cleaned_file, 'r', encoding='utf-8') as f:
            cleaned_lines = f.readlines()
    except FileNotFoundError as e:
        print(f"Error: {e}. Make sure both '{original_file}' and '{cleaned_file}' are present.")
        return

    # Extract the numbers from the cleaned file for easy lookup
    cleaned_numbers = set()
    for line in cleaned_lines:
        match = re.match(r'^(\d+)', line)
        if match:
            cleaned_numbers.add(int(match.group(1)))

    print("Searching for missing entries...")
    missing_count = 0
    
    # Iterate through the original file to find which numbers are missing
    for i, line in enumerate(original_lines):
        # This regex finds lines that are likely the start of an entry
        match = re.match(r'^\s*(\d+)\\?\.?\s', line.strip())
        if match:
            entry_number = int(match.group(1))
            if entry_number not in cleaned_numbers:
                missing_count += 1
                print(f"\n[Missing Entry #{entry_number}]")
                # Print the problematic line and a few lines after for context
                context_end = min(i + 3, len(original_lines))
                for j in range(i, context_end):
                    print(f"  Line {j+1}: {original_lines[j].strip()}")

    if missing_count == 0:
        print("No missing entries found. All 1000 words appear to be processed.")
    else:
        print(f"\nFound {missing_count} missing entries.")

if __name__ == "__main__":
    find_missing_entries()