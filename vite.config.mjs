import { defineConfig } from 'vite';
import path from 'path';

// This is your new Vite configuration file.
// It's much simpler than the Webpack one because Vite handles most things out of the box.
// It uses ES Modules syntax (`import`/`export`) which is the modern standard.

export default defineConfig({

    base: '',
    // Configure the build process
    build: {
        // The output directory for the production build
        outDir: 'dist',

        // Set to 'false' to disable minification for readable output as requested.
        // Comment this line out or set to 'esbuild' or 'terser' for minified code in production.
        minify: false,

        // Configure the output filenames to match your original Webpack setup
        rollupOptions: {
            output: {
                entryFileNames: `js/[name].js`,
                chunkFileNames: `js/[name].js`,
                assetFileNames: (assetInfo) => {
                    // Check if the asset is a CSS file
                    if (assetInfo.name.endsWith('.css')) {
                        return `css/[name][extname]`;
                    }
                    // Otherwise, assume it's an image or other asset
                    return `images/[name][extname]`;
                },
            },
        },

        // Clean the output directory before each build. This is equivalent to Webpack's 'clean: true'
        emptyOutDir: true,
    },

    // Configure the development server
    server: {
        // Open the browser automatically when the dev server starts
        open: true,
        // Set the host to 'localhost'
        host: 'localhost',
    },

    // Your Webpack config had rules for SASS and CSS.
    // Vite has native support for SASS, so no extra configuration is needed.
    // We'll set up a path alias for your assets to make the import cleaner.
    resolve: {
        alias: {
            '@assets': path.resolve(__dirname, 'src/assets'),
        },
    },
});