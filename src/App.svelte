<script>
	import {Router, Link, Route} from "svelte-routing";
	import Home from "./layouts/Home.svelte";
	import AboutUs from "./layouts/AboutUs.svelte";
	import Delivery from "./layouts/Delivery.svelte";
	import Contacts from "./layouts/Contacts.svelte";
	import AdminMenu from "./admin/AdminMenu.svelte";
	import ProductAdd from "./admin/ProductAdd.svelte";
	import ItemPage from "./layouts/ItemPage.svelte";
	import Catalog from "./layouts/Catalog.svelte";
	import NavMenu from "./components/NavMenu.svelte";
	import { modals, openModal, closeModal } from "./modalsStore";
	import Cart from "./components/Cart.svelte";
	import { cartItemCount } from "./cartStore";
	

	import {onMount} from "svelte";
 	import CheckOutPage from "./layouts/CheckOutPage.svelte";



	onMount(async() => {

        
		

		const script = document.createElement('script');
		script.src = '/static/public/script.js';
		script.type = 'text/javascript';
		script.onload = () => {

		};

		document.body.appendChild(script);
	});

</script>



<Router>

	<header class="flex w-full h-14 bg-primary font-roboto z-40 fixed top-0 box-border lg:justify-center">
		<nav class="flex flex-row-reverse w-full items-center justify-around md:justify-between md:pr-4 md:pl-4 lg:w-1/2">
			<button on:click={() => openModal('modal3')}
			 class="flex items-center align-baseline w-10 h-10 relative
			   before:content-[{ $cartItemCount }] before:absolute before:-top-1.5 before:right-4 before:h-4
			   before:w-4 before:bg-accent before:text-white before:rounded-full
			   before:flex before:justify-center before:items-center">
			   <span class="absolute -top-1.5 right-4 h-4 w-4 bg-red-500 text-white rounded-full">{$cartItemCount}</span>
				<i class="material-icons text-white text-3xl">shopping_cart</i>
			  </button>
			  
			<form title="search-form" class=" flex  align-baseline items-center w-1/2" action="#" method="post">
				<input class=" duration-500 ease-in-out w-full focus:transition-all focus:p-2 focus:outline-none rounded
				 caret-pink-300"
					   type="search" name="search" title="search" placeholder=" Я ищу... ">

			</form>

			

			<button aria-label="Open main menu" on:click={() => openModal('modal2')} class="text-white text-2xl
			 focus:outline-none">
				<span class="flex">☰</span>
			</button>
		</nav>

	</header>



	<main class="flex flex-col box-border font-roboto ">

		<Route path="/" component={Home} />
		<Route path="/about-us" component={AboutUs} />
		<Route path="/delivery" component={Delivery} />
		<Route path="/contacts" component={Contacts} />
		<Route path="/catalog"  component={Catalog} />
		<Route path="/manage" 	component={AdminMenu} />
		<Route path="/product/add" component={ProductAdd} />
		<Route path="/item/:id" let:params >
			<ItemPage id="{params.id}" />
		</Route>
		<Route path="/items-by-category/:category/:page" let:params >
			<Catalog category="{params.category}" page="{params.page}"/>
		</Route>
		<Route path="/check-out" component={CheckOutPage} />

		{#if $modals.modal2}
			<button on:click={() => closeModal('modal2')} class="flex fixed z-40 bg-white/30
 			backdrop-blur w-screen h-screen"></button>
			<NavMenu/>
		{/if}

		{#if $modals.modal3}
			<button on:click={() => closeModal('modal3')} class="flex fixed z-40 bg-white/30
			backdrop-blur w-screen h-screen"></button>
			<Cart />

		{/if}
		
	</main>

	


</Router>