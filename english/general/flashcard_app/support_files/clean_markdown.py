import re

def clean_markdown_file(input_file, output_file):
    """
    Reads a Markdown file, consolidates each numbered entry onto a single line,
    and writes the result to a new file.
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        processed_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Updated regex to handle both escaped dots (e.g., "1\.") and regular dots ("1.").
            if re.match(r'^\d+\\?\. ', line):
                processed_lines.append(line)
            elif processed_lines:
                # This is a continuation of the previous entry, so merge it.
                processed_lines[-1] = processed_lines[-1] + ' ' + line

        with open(output_file, 'w', encoding='utf-8') as f:
            for processed_line in processed_lines:
                f.write(processed_line + '\n')

        print(f"Successfully cleaned the file and saved it as {output_file}")
        print(f"Total entries processed: {len(processed_lines)}")

    except FileNotFoundError:
        print(f"Error: Input file not found at {input_file}")
    except Exception as e:
        print(f"An error occurred: {e}")

# --- Main execution ---
if __name__ == "__main__":
    input_filename = 'manhattan_prep_1000_gre_words.md'
    output_filename = 'cleaned_vocabulary.md'
    clean_markdown_file(input_filename, output_filename)