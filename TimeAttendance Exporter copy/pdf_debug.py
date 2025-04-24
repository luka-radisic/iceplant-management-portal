import os
import PyPDF2
import sys

def analyze_pdf(pdf_path):
    print(f"Analyzing PDF: {pdf_path}")
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        print(f"Number of pages: {len(reader.pages)}")
        
        # Extract and print text from first page to understand structure
        text = reader.pages[0].extract_text()
        print("\n--- First 1000 characters of extracted text ---")
        print(text[:1000])
        print("\n--- End of sample ---")
        
        # Save full text to a file for further analysis
        output_file = os.path.basename(pdf_path).replace('.pdf', '_text.txt')
        with open(output_file, 'w', encoding='utf-8') as out:
            for i in range(len(reader.pages)):
                page_text = reader.pages[i].extract_text()
                out.write(f"--- PAGE {i+1} ---\n")
                out.write(page_text)
                out.write("\n\n")
        
        print(f"Full text saved to {output_file}")

def main():
    # Check if PDF file path is provided as argument
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        # Use the first PDF in the pdfs directory
        pdf_dir = './pdfs'
        pdf_files = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]
        if not pdf_files:
            print("No PDF files found in ./pdfs directory")
            return
        pdf_path = os.path.join(pdf_dir, pdf_files[0])
    
    analyze_pdf(pdf_path)
    
if __name__ == "__main__":
    main()
