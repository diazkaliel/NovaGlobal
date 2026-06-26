import asyncio
import asyncpg

async def main():
    print("Intentando conectar a PostgreSQL para crear la base de datos...")
    conn = None
    try:
        # Nos conectamos a la base de datos por defecto 'postgres'
        conn = await asyncpg.connect(
            user="postgres",
            password="1219",
            host="127.0.0.1",
            port=5432,
            database="postgres"
        )
        
        # En Postgres no se puede ejecutar CREATE DATABASE dentro de una transacción.
        # Las llamadas directas a conn.execute() en asyncpg se ejecutan fuera de bloque de transacción implícito.
        await conn.execute("CREATE DATABASE novaglobal_db")
        print("¡Base de datos 'novaglobal_db' creada exitosamente!")
        
    except asyncpg.exceptions.DuplicateDatabaseError:
        print("Aviso: La base de datos 'novaglobal_db' ya existe en tu sistema.")
    except Exception as e:
        print(f"\n[ERROR] No se pudo crear la base de datos.")
        print(f"Detalle del error: {e}")
        print("\nVerifica que:")
        print("1. Tu servidor de PostgreSQL local esté encendido.")
        print("2. El usuario 'postgres' y la contraseña 's1219' sean los correctos para tu instalación.")
    finally:
        if conn:
            await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
