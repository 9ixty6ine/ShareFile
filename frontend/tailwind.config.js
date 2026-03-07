export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Syne", "system-ui", "sans-serif"],
      },
      colors: {
        accent: "#7c6dfa",
        "accent-2": "#06d6a0",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideInLeft: {
          from: { opacity: 0, transform: "translateX(-16px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-left": "slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};
