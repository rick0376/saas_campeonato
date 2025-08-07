import { useSession } from "next-auth/react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { useNavigation } from "../../hooks/useNavigation";
import styles from "./styles.module.scss";

type HomeProps = {
  session: any;
};

export default function Home({ session }: HomeProps) {
  const { homeMenuItems, isAdmin } = useNavigation();

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Bem-vindo ao LHP Cup Manager</h1>
            <p className={styles.subtitle}>
              Olá,{" "}
              <strong>{session?.user?.name || session?.user?.email}</strong>!
              Gerencie seu campeonato de futebol de forma fácil e eficiente.
            </p>
            {isAdmin && (
              <div className={styles.adminBadge}>
                <span>👑 Administrador</span>
              </div>
            )}
          </div>

          <div className={styles.grid}>
            {homeMenuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={`${styles.card} ${styles[item.color]}`}
                >
                  <div className={styles.cardIcon}>
                    <IconComponent size={24} />
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <p className={styles.cardDescription}>{item.description}</p>
                  </div>
                  <div className={styles.cardArrow}>→</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
