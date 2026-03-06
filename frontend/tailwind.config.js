export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        vault: { 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" },
      },
      fontFamily: { sans: ["DM Sans", "system-ui", "sans-serif"] },
      animation: { "fade-in": "fadeIn 0.3s ease-out", "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};