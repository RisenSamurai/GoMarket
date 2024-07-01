<script>

    import {onMount} from "svelte";
    import {host_address} from "../store.js";

    let categories = [];
    let subcategories = [];
    let types = [
        "Косметика",
        "Добавки",
        "Техника",
        "Мебель",
        "Другое",

    ];
    let ingredientsList = [];
    let ingredient = "";

    let msg = '';

    let name = "";
    let category = "";
    let subcategory = "";
    let volume = "";
    let price = "";
    let country = "";
    let description = "";
    let type = "";
    let image;
    let use = "";
    let brand = ""
    let isDiscount;
    let discountSize = "";
    let isNew;
    let isStock;
    let sku;
    let howToUse ="";

    function pushIngredient(event) {
        event.preventDefault()
        if (ingredient.trim() !== "") {
            ingredientsList.push(ingredient);
            ingredientsList = ingredientsList;
            ingredient = "";
        }
    }

    function handleImage(event) {
        image = event.target.files[0];
    }

    onMount( async () => {
        const fetchCategories = await fetch($host_address + "/get-category-list", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }).then(r => r.json().then(data => r.ok ? data : Promise.reject(data)))

        const fetchSubCategories = await fetch($host_address + "/subcategory", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }).then(r => r.json().then(data => r.ok ? data : Promise.reject(data)))

        try {

            categories = await fetchCategories;


        }catch (e) {
            msg = "Ошибка при получении категорий!";
            console.log("Error during fetching categories!", e);
        }

        try {
            subcategories = await fetchSubCategories;

        } catch (e) {
            msg = "Ошибка при получении подкатегорий!";
            console.log("Error during fetching subcategories!", e);
        }

    })

    async function pushProduct() {

        try {
            const formData = new FormData();

            formData.append("name", name);
            formData.append("section", category);
            formData.append("subsection", subcategory);
            formData.append("price", price);
            formData.append("volume", volume);
            formData.append("country", country);
            formData.append("ingredients", JSON.stringify(ingredientsList));
            formData.append("description", description);
            formData.append("use", use);
            formData.append("type", type);
            formData.append("brand", brand);
            formData.append("discount", isDiscount);
            formData.append("new", isNew);
            formData.append("stock", isStock);
            formData.append("sku", sku);
            formData.append("discountSize", discountSize);
            formData.append("howToUse", howToUse);
            if (image) {
                formData.append("image", image)
            }
            const response = await fetch($host_address + "/item/add", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                msg = data.msg;
            }
            else {
                msg = data;
            }

        } catch (e) {

            msg = e.message;


        }

    }

</script>


<section class="flex flex-col items-center p-4 relative top-14">
    <h2 class="font-bold text-2xl mb-4">Добавить товар</h2>

    {#if msg}
        <p class="text-red-500">{msg}</p>
        {/if}

    <form on:submit|preventDefault={pushProduct} class="flex flex-col w-full items-center justify-center"
          enctype="multipart/form-data">
        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label class="mb-2" for="name">Название</label>
            <input bind:value={name} type="text" id="name" placeholder="Название...">
        </div>
        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="section">Категория</label>
            <select bind:value={category} name="section">
                {#each categories as category}
                <option value="{category.Name}">{category.Name}</option>
                    {/each}
            </select>


        </div>
        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="subsection">Подкатегория</label>
            <select bind:value={subcategory} name="subsection">
                {#each subcategories as subcategory}
                    <option value="{subcategory.Name}">{subcategory.Name}</option>
                    {/each}

            </select>
        </div>
        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="subsection">Тип</label>
            <select bind:value={type} name="type">
                {#each types as type}
                    <option value="{type}">{type}</option>
                {/each}

            </select>
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="volume">Цена</label>
            <input bind:value={price} type="text" name="price" placeholder="100">
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="volume">Объём</label>
            <input bind:value={volume} type="text" name="volume" placeholder="100">
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="volume">Страна</label>
            <input bind:value={country} type="text" name="country" placeholder="Япония">
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="volume">Состав</label>



            <input bind:value={ingredient} type="text" name="ingredients" placeholder="Чайное дерево">
            <button on:click={pushIngredient}
                    class="flex justify-center items-center cursor-pointer rounded-3xl
                          w-11/12 uppercase font-bold
                          text-white self-center pr-4 pl-4 mb-5 mt-6 h-12
                          bg-gradient-to-r from-purple-500 to-pink-500">Добавить</button>

        </div>

        <ul class="flex flex-col">
            {#each ingredientsList as ingredient, index }
                <li>{index + 1}: {ingredient}</li>
            {/each}
        </ul>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="use">Назначение</label>
            <select bind:value={use} name="use" id="use">
                    <option value="Для лица">Для лица</option>
                    <option value="Для рук">Для рук</option>
                    <option value="Для ног">Для ног</option>
                    <option value="Для тела">Для тела</option>
                    <option value="Для головы">Для головы</option>
                    <option value="Омоложение">Омоложение</option>
                    <option value="Для волос, ногтей, кожи">Для волос, ногтей, кожи</option>

            </select>
        </div>


        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="volume">Бренд</label>
            <input bind:value={brand} type="text" name="brand" placeholder="Meiji">
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="discount">Товар со скидкой?</label>
            <select bind:value={isDiscount} name="discount" id="discount">
                <option value="true">Да</option>
                <option value="false">Нет</option>
            </select>
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="discountSize">Размер скидки в %</label>
            <input bind:value={discountSize} type="text" name="discountSize" placeholder="5" id="discountSize">
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="new">Новинка?</label>
            <select bind:value={isNew} name="new" id="new">
                <option value="true">Да</option>
                <option value="false">Нет</option>
            </select>
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="stock">В наличии?</label>
            <select bind:value={isStock} name="stock" id="stock">
                <option value="true">Да</option>
                <option value="false">Нет</option>
            </select>
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="sku">Количество на складе</label>
            <input bind:value={sku} type="text" name="sku" placeholder="15" id="sku">
        </div>

        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="howTo">Способ применения</label>
            <input bind:value={howToUse} type="text" name="howToUse" placeholder="15" id="howTo">
        </div>





        <div class="flex flex-col w-full mb-2border-b border-b-slate-400">
            <label for="descr">Описание</label>
            <textarea bind:value={description} class="border border-slate-300" name="descr"></textarea>
        </div>
        <div class="flex flex-col w-full mb-2 border-b border-b-slate-400">
            <label for="image">Изображение</label>
            <input on:change={handleImage} type="file">
        </div>


        <input class="flex justify-center items-center cursor-pointer rounded-3xl w-11/12 uppercase font-bold
            text-white self-center pr-4 pl-4 mb-5 mt-6 h-12 bg-gradient-to-r from-purple-500 to-pink-500"
               type="submit" value="Добавить">

    </form>


</section>