// Toutes les adresses /api/… : le code des classements est dans classement/api.js
import { onRequest as classement } from '../../classement/api.js';

export const onRequest = (context) => classement(context);
