import App from './App.svelte';
import '/styles/output.css';



const app = new App({
	target: document.body,
	props: {
		name: 'world'
	}
});

export default app;