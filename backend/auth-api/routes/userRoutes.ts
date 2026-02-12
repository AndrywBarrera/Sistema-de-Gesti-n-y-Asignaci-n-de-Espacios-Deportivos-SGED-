import { Router } from "../deps.ts";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import {
    getUsers,
    loginUser,
    registerUser,
} from "../controllers/userController.ts";

const router = new Router();

router
    .get("/api/users", authMiddleware, getUsers) // Ruta protegida por JWT
    .post("/api/login", loginUser) // Ruta pública
    .post("/api/register", registerUser); // Ruta pública

export default router;
