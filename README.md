# ClearScan 📄✨

ClearScan is a minimal, modern PDF viewer and analysis tool built with React and Tailwind CSS. It provides a sleek interface for viewing multi-page PDF documents, zooming, and performing automated document checks with visual error overlays.

![ClearScan Preview](https://via.placeholder.com/800x450?text=ClearScan+PDF+Viewer+Interface)

## 🚀 Features

- **High-Performance Rendering**: Clean and sharp PDF rendering using `react-pdf` and `pdfjs-dist`.
- **Multi-Page Support**: View entire documents in a continuous scrolling layout.
- **Interactive Analysis**: "Check" feature that simulates automated document validation (SOP compliance) with visual error highlights and tooltips.
- **Intuitive Controls**:
  - Loads `public/sop.pdf` by default
  - Upload your own PDF (`.pdf`) to render it client-side
  - Zoom in/out, and switch between documents easily.
- **Modern UI**: Sleek dark-mode interface with a focus on usability and aesthetics.
- **Error Handling**: Robust handling for network errors, invalid file types, and document parsing issues.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **PDF Engine**: [React-PDF](https://projects.wojtekmaj.pl/react-pdf/) / [PDF.js](https://mozilla.github.io/pdf.js/)
- **Build Tool**: [Vite](https://vitejs.dev/)

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/clearscan.git
   cd clearscan
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

## 📦 Building for Production

To create an optimized production build:

```bash
npm run build
```

The output will be in the `dist/` directory.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
