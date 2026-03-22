/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#1A5C38",
                secondary: "#2E8B57",
            }
        },
    },
    plugins: [],
}
