module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'roboto': ['Roboto', 'sans-serif']
      },
      position: ['before', 'after'],
      inset: ['before', 'after'],
      padding: ['before', 'after'],
      backgroundColor: ['before', 'after'],
      textColor: ['before', 'after'],
      fontWeight: ['before', 'after'],
      borderRadius: ['before', 'after'],

      colors: {
        primary: '#3498db',
        secondary: '#2ecc71',
        accent: '#e74c3c',
        dark: '#2c3e50',
        light: '#ecf0f1',
      },
    },



  },
  content: ['./public/**/*.html', './src/**/*.svelte'],
};
