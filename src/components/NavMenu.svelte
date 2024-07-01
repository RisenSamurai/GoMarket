
<script>
    import {Router, Link, Route} from "svelte-routing";
    import { fade, slide, scale, fly } from "svelte/transition";
    import { navigate } from "svelte-routing";
    import { modals, openModal, closeModal } from "../modalsStore";
  import Button from "./Button.svelte";

    function navigateTo(page) {

        navigate(page);
        closeModal('modal2');

    }

   export let links = [
        { to: '/about-us', text: 'О нас'},
        { to: '/contacts', text: 'Контакты'},
        { to: '/delivery', text: 'Доставка и оплата'},
        { to: '/manage', text: 'Панель администратора'},
    ];
</script>


<aside in:fly={{x: -300, duration: 500}} out:fly={{x: -300, duration: 500}}
       class="flex flex-col h-screen w-2/3 fixed top-0 pt-0 bg-white z-50 shadow-md shadow-gray overflow-auto md:w-1/2 lg:w-1/6">

    <div class="flex h-14 items-center bg-primary">
        <Link on:click={() => navigateTo('/')} to="/" class="inline-flex w-full text-l justify-center uppercase font-bold text-white">GoMarket</Link>
    </div>

    <Link on:click={() => navigateTo('/catalog')} to="/catalog" class="flex border-t border-b border-slate-200 w-full hover:bg-light transition-colors duration-200">
        <div class="flex w-full p-2 items-center">
            <div class="inline-flex mr-6 h-10 w-10 bg-primary rounded-full justify-center items-center">
                <i class="flex material-icons text-white" style="font-size: 26px">menu_book</i>
            </div>
            <span>Каталог товаров</span>
        </div>
    </Link>

    <button on:click={() => openModal('modal3')} class="flex w-full p-2 items-center hover:bg-light transition-colors duration-200">
        <div class="inline-flex mr-6 h-10 w-10 bg-primary rounded-full justify-center items-center">
            <i class="flex material-icons text-white" style="font-size: 26px">shopping_cart</i>
        </div>
        <span>Корзина</span>
    </button>

    <div class="flex flex-col p-2 mt-6">
        <h3 class="flex text-gray-500 mb-4">Информация о компании</h3>
        {#each links as {to, text}}
            <button on:click={() => {navigateTo(to)}} class="flex mb-1.5 hover:text-primary transition-colors duration-200">{text}</button>
        {/each}
    </div>

    <div class="flex flex-col p-2 mt-8">
        <h3 class="flex text-gray-700 mb-4">Мы в соц.сетях</h3>
        <div class="flex space-x-2">
            <a class="flex w-12 h-12 transition-transform transform hover:scale-110" href="https://www.instagram.com/japano_mania_/" target="_blank">
                <img src="/static/public/images/icons/icons8-instagram.svg" alt="instagram">
            </a>
            <a class="flex w-12 h-12 transition-transform transform hover:scale-110" href="https://t.me/japano_mania_shop" target="_blank">
                <img src="/static/public/images/icons/icons8-telegram.svg" alt="telegram">
            </a>
            <a class="flex w-12 h-12 transition-transform transform hover:scale-110" href="#">
                <img src="/static/public/images/icons/icons8-viber.svg" alt="viber">
            </a>
        </div>
    </div>
</aside>


