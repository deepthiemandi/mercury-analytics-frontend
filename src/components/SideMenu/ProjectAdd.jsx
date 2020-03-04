import React from 'react';
import styles from './ProjectAdd.module.css';
import Routes from '../../utils/routes';
import { Link } from 'react-router-dom';
import { MdFolder } from 'react-icons/md';

const ProjectAdd = () => {
  return (
    <div className={styles.container}>
      <Link to={Routes.CreateProject}>
        <div className={styles.button}>
          <MdFolder className={styles.icon} />
          <span className={styles.name}>+ Add new project</span>
        </div>
      </Link>
    </div>
  );
};

export default ProjectAdd;
