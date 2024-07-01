<script>
    import {Link} from "svelte-routing";
</script>


<section class="flex flex-col items-center p-4 relative top-14">
    <h2 class="text-2xl">Кабинет администратора</h2>
    <div class="flex flex-col  items-center w-1/2">
        <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white
         text-white font-bold" to="/product/add">Добавить товар</Link>
        <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white
         text-white border-b-white font-bold" to="/categories/add">Добавить категорию</Link>
        <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white
         text-white border-b-white font-bold" to="/product/change">Изменить товар</Link>
        <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white
         text-white border-b-white font-bold" to="/product/list">Список товаров</Link>
        <Link class="flex justify-center items-center h-14 w-full bg-violet-500 border-b border-b-white
         text-white border-b-white font-bold" to="/orders">Список заказов</Link>
    </div>
</section>