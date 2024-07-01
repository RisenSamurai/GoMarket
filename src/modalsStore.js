import { writable } from "svelte/store";

export const modals = writable([]);


export function openModal(id) {
    modals.update(currentModals =>({
        ...currentModals,
        [id]: true
    }));
}

export function closeModal(id) {
    modals.update(currentModals =>({
        ...currentModals,
        [id]: false
    }));
}