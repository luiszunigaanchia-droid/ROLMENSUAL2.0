'use strict';

window.ROL_CONFIG = Object.freeze({
  appVersion: '3.0.0',
  sections: [
    {
        "name": "Banco de Sangre",
        "color": "#b91c1c",
        "shifts": [
            "6am-3pm",
            "1pm-10pm",
            "10pm-7am"
        ],
        "slots": {
            "6am-3pm": [
                "MQC", "MQC", "MQC", "MQC", "MQC", "DPL", "T2", "DPL", "DPL", "DPL", "DPL", "T2", "T1", "T1", "T1", "T1"
            ],
            "1pm-10pm": [
                "MQC", "T2", "T2", "T1", "T1", "T2"
            ],
            "10pm-7am": [
                "MQC", "T2", "T2", "DPL/T2", "DPL"
            ]
        }
    },
    {
        "name": "Biología Molecular",
        "color": "#0f766e",
        "shifts": [
            "Turno Único"
        ],
        "slots": {
            "Turno Único": [
                "MQC", "MQC", "MQC", "MQC", "MQC", "DPL", "T2"
            ]
        }
    },
    {
        "name": "Dirección de Laboratorio Clínico",
        "color": "#4f46e5",
        "shifts": [
            "Turno Único"
        ],
        "slots": {
            "Turno Único": [
                "MQC", "MQC", "PROF"
            ]
        }
    },
    {
        "name": "Emergencias",
        "color": "#7c3aed",
        "shifts": [
            "6am-3pm",
            "1pm-10pm",
            "10pm-7am"
        ],
        "slots": {
            "6am-3pm": [
                "MQC", "MQC", "T2", "T1", "T1"
            ],
            "1pm-10pm": [
                "MQC", "T2", "T1", "T1", "DPL"
            ],
            "10pm-7am": [
                "MQC", "MQC", "MQC", "MQC", "MQC", "DPL", "T2"
            ]
        }
    },
    {
        "name": "Gestión de Calidad",
        "color": "#4d7c0f",
        "shifts": [
            "Turno Único"
        ],
        "slots": {
            "Turno Único": [
                "MQC", "MQC", "MQC", "DPL"
            ]
        }
    },
    {
        "name": "Hematología",
        "color": "#be123c",
        "shifts": [
            "6am-3pm",
            "1pm-10pm"
        ],
        "slots": {
            "6am-3pm": [
                "MQC", "MQC", "MQC", "MQC", "MQC", "MQC", "DPL", "DPL", "DPL", "T2/T1"
            ],
            "1pm-10pm": [
                "DPL"
            ]
        }
    },
    {
        "name": "Hormonas y Marcadores Tumorales",
        "color": "#be185d",
        "shifts": [
            "Turno Único"
        ],
        "slots": {
            "Turno Único": [
                "MQC", "MQC", "MQC", "MQC", "MQC", "MQC", "DPL", "DPL", "T2", "DPL", "T2", "T1"
            ]
        }
    },
    {
        "name": "Inmunología",
        "color": "#047857",
        "shifts": [
            "6am-3pm",
            "1pm-10pm"
        ],
        "slots": {
            "6am-3pm": [
                "MQC", "MQC", "MQC", "MQC", "MQC", "MQC", "MQC", "DPL", "DPL", "DPL", "T2", "DPL/T2", "DPL/DPL", "DPL", "T2", "T2", "T1"
            ],
            "1pm-10pm": [
                "MQC", "MQC", "DPL"
            ]
        }
    },
    {
        "name": "Microbiología",
        "color": "#b45309",
        "shifts": [
            "6am-3pm",
            "1pm-10pm"
        ],
        "slots": {
            "6am-3pm": [
                "MQC", "MQC", "MQC", "MQC", "MQC", "MQC", "MQC", "DPL", "DPL", "DPL", "DPL", "DPL", "T2", "T2/T1", "T2", "DPL/DPL", "T1/T1", "T1/T1"
            ],
            "1pm-10pm": [
                "DPL", "T1/T1"
            ]
        }
    },
    {
        "name": "Química Clínica",
        "color": "#0369a1",
        "shifts": [
            "6am-3pm",
            "1pm-10pm"
        ],
        "slots": {
            "6am-3pm": [
                "MQC", "MQC", "MQC", "MQC", "DPL", "DPL", "T2", "T2/T2", "DPL", "T1", "T1", "T1/T2"
            ],
            "1pm-10pm": [
                "MQC", "DPL", "T1", "T1", "T1"
            ]
        }
    },
    {
        "name": "Unidad Preanalítica",
        "color": "#0e7490",
        "shifts": [
            "Turno Único"
        ],
        "slots": {
            "Turno Único": [
                "MQC", "T1", "T1", "T1", "T1", "T1", "T1"
            ]
        }
    }
  ],
  defaultEmployees: [
    { "name": "Dra. Nydia Lobo", "role": "MQC", "baseSection": "Química Clínica" },
    { "name": "Dra. Dayanna Álvarez", "role": "MQC", "baseSection": "Química Clínica" },
    { "name": "Dr. Andony Cordero", "role": "MQC", "baseSection": "Química Clínica" },
    { "name": "Dra. Karolina Fallas", "role": "MQC", "baseSection": "Química Clínica" },
    { "name": "Dra. Alexa Marín", "role": "MQC", "baseSection": "Química Clínica" },
    { "name": "Dr. Randall Torres", "role": "MQC", "baseSection": "Química Clínica" },
    { "name": "Dra. Sofía Herrera", "role": "MQC", "baseSection": "Química Clínica" },
    { "name": "Danny Ramírez", "role": "DPL", "baseSection": "Química Clínica" },
    { "name": "Alexander Rodríguez", "role": "DPL", "baseSection": "Química Clínica" },
    { "name": "Dannia Villalobos", "role": "T2", "baseSection": "Química Clínica" },
    { "name": "Valeria Hernández", "role": "T2", "baseSection": "Química Clínica" },
    { "name": "Sofía Navarro", "role": "T2", "baseSection": "Química Clínica" },
    { "name": "Luis Guillermo Ramírez", "role": "DPL", "baseSection": "Química Clínica" },
    { "name": "Dagoberto Matarrita", "role": "T1", "baseSection": "Química Clínica" },
    { "name": "Josué Rivera", "role": "T1", "baseSection": "Química Clínica" },
    { "name": "Yosseth Acuña", "role": "T1", "baseSection": "Química Clínica" },
    { "name": "María Fernanda Cedeño", "role": "T1", "baseSection": "Química Clínica" },
    { "name": "Dr. Paul Murillo", "role": "MQC", "baseSection": "Química Clínica" },
    { "name": "Fabián González", "role": "DPL", "baseSection": "Química Clínica" },
    { "name": "Jorge Marín", "role": "T1", "baseSection": "Química Clínica" },
    { "name": "Florencia Sánchez", "role": "T1", "baseSection": "Química Clínica" },
    { "name": "Alba Lira", "role": "T1", "baseSection": "Química Clínica" },
    { "name": "Norbel Herrera", "role": "T1", "baseSection": "Química Clínica" },
    { "name": "Dr. Diego Molina", "role": "MQC", "baseSection": "Hematología" },
    { "name": "Dr. Josué Solano", "role": "MQC", "baseSection": "Hematología" },
    { "name": "Dra. Luisa Vindas", "role": "MQC", "baseSection": "Hematología" },
    { "name": "Dra. Yaoska Rojas", "role": "MQC", "baseSection": "Hematología" },
    { "name": "Dr. Geovanny Zeledón", "role": "MQC", "baseSection": "Hematología" },
    { "name": "Dra. Juliana Mora", "role": "MQC", "baseSection": "Hematología" },
    { "name": "Lourdes Vargas", "role": "DPL", "baseSection": "Hematología" },
    { "name": "Vanessa Hernández", "role": "DPL", "baseSection": "Hematología" },
    { "name": "Fabián López", "role": "DPL", "baseSection": "Hematología" },
    { "name": "Diandra Ortiz", "role": "DPL", "baseSection": "Hematología" },
    { "name": "Joel Rodríguez", "role": "T2", "baseSection": "Hematología" },
    { "name": "Andrés Badilla", "role": "DPL", "baseSection": "Hematología" },
    { "name": "Dr. Francisco Rodríguez", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dr. Marvin Durán", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dra. Mónica Flores", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dra. Pamela Serrano", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dr. Carlos Varela", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dr. Diego Morazán", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dra. Rocío Rodríguez", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dra. Georgina Jiménez", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dra. Rocío Quesada", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dra. Priscilla Orlich", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Jesús Solís", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "María Venegas", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "Yerlin Avellán", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "Leticia Morales", "role": "T2", "baseSection": "Inmunología" },
    { "name": "Evelyn Fernández", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "Fabio Hernández", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "Sally Torres", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "Melissa García", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "Steven Obando", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "Noelia Matamoros", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "Gloriana Víquez", "role": "T2", "baseSection": "Inmunología" },
    { "name": "Michael Venegas", "role": "T2", "baseSection": "Inmunología" },
    { "name": "Eilyn Cortés", "role": "T1", "baseSection": "Inmunología" },
    { "name": "Dra. Paola Sánchez", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dra. Jimena Sánchez", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Dra. Silvia Araya", "role": "MQC", "baseSection": "Inmunología" },
    { "name": "Alejandro Zeledón", "role": "DPL", "baseSection": "Inmunología" },
    { "name": "Dra. Elvira Segura", "role": "MQC", "baseSection": "Microbiología" },
    { "name": "Dr. Daniel Cascante", "role": "MQC", "baseSection": "Microbiología" },
    { "name": "Dr. Alberto Quirós", "role": "MQC", "baseSection": "Microbiología" },
    { "name": "Dra. Andrea Ruiz", "role": "MQC", "baseSection": "Microbiología" },
    { "name": "Dr. Carlos Espinoza", "role": "MQC", "baseSection": "Microbiología" },
    { "name": "Dra. Isabel Ramírez", "role": "MQC", "baseSection": "Microbiología" },
    { "name": "Dra. Samantha Jiménez", "role": "MQC", "baseSection": "Microbiología" },
    { "name": "Dra. Karol Hidalgo", "role": "MQC", "baseSection": "Microbiología" },
    { "name": "Manuel Herrera", "role": "DPL", "baseSection": "Microbiología" },
    { "name": "Vanessa Ovares", "role": "DPL", "baseSection": "Microbiología" },
    { "name": "Jonathan Rojas", "role": "DPL", "baseSection": "Microbiología" },
    { "name": "Daniel Zapata", "role": "DPL", "baseSection": "Microbiología" },
    { "name": "José Cascante", "role": "DPL", "baseSection": "Microbiología" },
    { "name": "Edgar Arias", "role": "T2", "baseSection": "Microbiología" },
    { "name": "Marta Ramírez", "role": "T2", "baseSection": "Microbiología" },
    { "name": "Arelys Villalobos", "role": "T2", "baseSection": "Microbiología" },
    { "name": "Mariana Chacón", "role": "DPL", "baseSection": "Microbiología" },
    { "name": "Felicia Mora", "role": "DPL", "baseSection": "Microbiología" },
    { "name": "Anthony Castillo", "role": "T1", "baseSection": "Microbiología" },
    { "name": "Andrés Torres", "role": "T1", "baseSection": "Microbiología" },
    { "name": "Alejandra Álvarez", "role": "T1", "baseSection": "Microbiología" },
    { "name": "Melissa Dennis", "role": "DPL", "baseSection": "Microbiología" },
    { "name": "Moisés Baca", "role": "T1", "baseSection": "Microbiología" },
    { "name": "Dra. Ana Lucía Valerín", "role": "MQC", "baseSection": "Banco de Sangre" },
    { "name": "Dra. Nancy Castrillo", "role": "MQC", "baseSection": "Banco de Sangre" },
    { "name": "Dr. Rodrigo Quesada", "role": "MQC", "baseSection": "Banco de Sangre" },
    { "name": "Dr. Armando Solano", "role": "MQC", "baseSection": "Banco de Sangre" },
    { "name": "Dr. Víctor González", "role": "MQC", "baseSection": "Banco de Sangre" },
    { "name": "Kassia Zúñiga", "role": "DPL", "baseSection": "Banco de Sangre" },
    { "name": "Silvia Masís", "role": "T2", "baseSection": "Banco de Sangre" },
    { "name": "Yeison Zamora", "role": "DPL", "baseSection": "Banco de Sangre" },
    { "name": "Marcia Vásquez", "role": "DPL", "baseSection": "Banco de Sangre" },
    { "name": "Daylin Fonseca", "role": "DPL", "baseSection": "Banco de Sangre" },
    { "name": "Katherine Pereira", "role": "DPL", "baseSection": "Banco de Sangre" },
    { "name": "Kimberly Guzmán", "role": "T2", "baseSection": "Banco de Sangre" },
    { "name": "Juan Mora", "role": "T1", "baseSection": "Banco de Sangre" },
    { "name": "Mauricio Méndez", "role": "T1", "baseSection": "Banco de Sangre" },
    { "name": "Johan Bustos", "role": "T1", "baseSection": "Banco de Sangre" },
    { "name": "Diana Padilla", "role": "T1", "baseSection": "Banco de Sangre" },
    { "name": "Dra. Adriana Gamboa", "role": "MQC", "baseSection": "Banco de Sangre" },
    { "name": "Juan Carlos Ruiz", "role": "T2", "baseSection": "Banco de Sangre" },
    { "name": "Luis Solano", "role": "T2", "baseSection": "Banco de Sangre" },
    { "name": "Paul Barrantes", "role": "T1", "baseSection": "Banco de Sangre" },
    { "name": "Michael Jiménez", "role": "T1", "baseSection": "Banco de Sangre" },
    { "name": "Luis Zúñiga", "role": "T2", "baseSection": "Banco de Sangre" },
    { "name": "Dra. Carmen Cabalceta", "role": "MQC", "baseSection": "Banco de Sangre" },
    { "name": "Ricardo Brenes", "role": "T2", "baseSection": "Banco de Sangre" },
    { "name": "Gerald Enríquez", "role": "T2", "baseSection": "Banco de Sangre" },
    { "name": "Keiry Espinoza", "role": "DPL", "baseSection": "Banco de Sangre" },
    { "name": "Josselyn Salazar", "role": "DPL", "baseSection": "Banco de Sangre" },
    { "name": "Dra. Patricia González", "role": "MQC", "baseSection": "Emergencias" },
    { "name": "Dr. Sergio Bermúdez", "role": "MQC", "baseSection": "Emergencias" },
    { "name": "Esteban Ugalde", "role": "T2", "baseSection": "Emergencias" },
    { "name": "Karolina Orozco", "role": "T1", "baseSection": "Emergencias" },
    { "name": "Luis Antonio Ramírez", "role": "T1", "baseSection": "Emergencias" },
    { "name": "Gianina Castro", "role": "T1", "baseSection": "Emergencias" },
    { "name": "Dra. Pamela Mora", "role": "MQC", "baseSection": "Emergencias" },
    { "name": "Dra. Maricela García", "role": "MQC", "baseSection": "Emergencias" },
    { "name": "Jonathan Morales", "role": "T2", "baseSection": "Emergencias" },
    { "name": "Mariela Delgado", "role": "T1", "baseSection": "Emergencias" },
    { "name": "Keysha Sánchez", "role": "T1", "baseSection": "Emergencias" },
    { "name": "Silvia Goussen", "role": "DPL", "baseSection": "Emergencias" },
    { "name": "Dra. Libia Gamboa", "role": "MQC", "baseSection": "Emergencias" },
    { "name": "Dra. Elizabeth Rojas", "role": "MQC", "baseSection": "Biología Molecular" },
    { "name": "Dra. Nicole Vargas", "role": "MQC", "baseSection": "Biología Molecular" },
    { "name": "Dra. María José Corrales", "role": "MQC", "baseSection": "Biología Molecular" },
    { "name": "Dra. Sharon Maynard", "role": "MQC", "baseSection": "Biología Molecular" },
    { "name": "Dra. Natalia Hernández", "role": "MQC", "baseSection": "Biología Molecular" },
    { "name": "Nicole Acuña", "role": "DPL", "baseSection": "Biología Molecular" },
    { "name": "Naomy Esquivel", "role": "T2", "baseSection": "Biología Molecular" },
    { "name": "Dra. Karla Gómez", "role": "MQC", "baseSection": "Unidad Preanalítica" },
    { "name": "Deilyn Morales", "role": "T1", "baseSection": "Unidad Preanalítica" },
    { "name": "Sebastián Quesada", "role": "T1", "baseSection": "Unidad Preanalítica" },
    { "name": "Enrique Sojo", "role": "T1", "baseSection": "Unidad Preanalítica" },
    { "name": "Jorge Valverde", "role": "T1", "baseSection": "Unidad Preanalítica" },
    { "name": "Karen Bolaños", "role": "T1", "baseSection": "Unidad Preanalítica" },
    { "name": "Juan Pablo Quesada", "role": "T1", "baseSection": "Unidad Preanalítica" },
    { "name": "Marietta Rivas", "role": "T1", "baseSection": "Unidad Preanalítica" },
    { "name": "Dr. Carlos Solano", "role": "MQC", "baseSection": "Gestión de Calidad" },
    { "name": "Dra. Jimena Casasola", "role": "MQC", "baseSection": "Gestión de Calidad" },
    { "name": "Dra. Lizeth Murillo", "role": "MQC", "baseSection": "Gestión de Calidad" },
    { "name": "Óscar Azofeifa", "role": "DPL", "baseSection": "Gestión de Calidad" },
    { "name": "Dra. Pamela Loaiza", "role": "MQC", "baseSection": "Dirección de Laboratorio Clínico" },
    { "name": "Dr. Vernon Rojas", "role": "MQC", "baseSection": "Dirección de Laboratorio Clínico" },
    { "name": "Lic. María Luisa Jiménez", "role": "PROF", "baseSection": "Dirección de Laboratorio Clínico" },
    { "name": "Dr. Óscar Guevara", "role": "MQC", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Dra. Melissa Carazo", "role": "MQC", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Dr. Jonathan Rojas", "role": "MQC", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Dra. Gloriana Escalante", "role": "MQC", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Dra. Alissa Rodríguez", "role": "MQC", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Alejandra Ramírez", "role": "DPL", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Karen Astúa", "role": "DPL", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Xinia Arrieta", "role": "T2", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Adriana Matamoros", "role": "DPL", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Nidia Calvo", "role": "T2", "baseSection": "Hormonas y Marcadores Tumorales" },
    { "name": "Emmanuel Abad", "role": "T1", "baseSection": "Hormonas y Marcadores Tumorales" }
  ]
});
