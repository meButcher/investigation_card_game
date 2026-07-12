import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default {
  preprocess: vitePreprocess(),
  // Dev-only visual inspector: press Ctrl+Shift, hover any element in the browser,
  // click → your editor jumps to the exact Svelte source line. (No effect on builds.)
  vitePlugin: { inspector: { toggleKeyCombo: 'control-shift', showToggleButton: 'always' } },
};
