import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { Map, TileLayer, Marker } from 'react-leaflet';
import { LeafletMouseEvent } from 'leaflet';
import axios from 'axios';

import Dropzone from '../../components/Dropzone';

import api from '../../services/api';

import './styles.css';
import logo from '../../assets/logo.svg';

interface Item {
    id: number,
    name: string,
    image_url: string
}

interface UF {
    abbreviation: string,
    name: string
}

interface IBGEUFResponse {
    sigla: string,
    nome: string
}

interface IBGECityResponse {
    nome: string
}

const CreatePoint = () => {
    const [initialPosition, setInitialPosition] = useState<[number, number]>([-23.4994227, -49.2819722]);
    const [items, setItems] = useState<Item[]>([]);
    const [disabledCity, setDisabledCity] = useState(true);

    const [ufs, setUFs] = useState<UF[]>([]);
    const [cities, setCities] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: ''
    });

    const [selectedUf, setSelectedUf] = useState('0');
    const [selectedCity, setSelectedCity] = useState('0');
    const [selectedPosition, setSelectedPosition] = useState<[number, number]>([0, 0]);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [selectedFile, setSelectedFile] = useState<File>();

    const history = useHistory();

    useEffect(() => {
        api.get('items').then(response => {
            setItems(response.data);
        });
    }, []);

    useEffect(() => {
        axios.get<IBGEUFResponse[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome').then(response => {
            let UFs: UF[] = [];

            response.data.map(uf => {
                return UFs.push({
                    abbreviation: uf.sigla,
                    name: uf.nome
                });
            });

            setUFs(UFs);
        });
    }, []);

    useEffect(() => {
        if(selectedUf === '0') {
            return;
        }

        axios.get<IBGECityResponse[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios`).then(response => {
           const cityNames = response.data.map(city => city.nome);

           setCities(cityNames);
        });
    }, [selectedUf]);
    
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;

            setInitialPosition([latitude, longitude]);
        });
    }, []);

    function handleSelectedUF(event: ChangeEvent<HTMLSelectElement>) {
        const selectedUF = event.target.value;
        setSelectedUf(selectedUF);
        setDisabledCity(false);
    }

    function handleSelectedCity(event: ChangeEvent<HTMLSelectElement>) {
        const selectedCity = event.target.value;
        setSelectedCity(selectedCity);
    }

    function handleMapClick(event: LeafletMouseEvent) {
        setSelectedPosition([
            event.latlng.lat,
            event.latlng.lng
        ]);
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
    }

    function handleSelectedItem(id: number) {
        const alreadySelected = selectedItems.findIndex(item => item === id);

        if(alreadySelected !== -1) {
            const filteredItems = selectedItems.filter(item => item !== id);

            setSelectedItems(filteredItems);
        } else {
            setSelectedItems([...selectedItems, id]);
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const { name, email, whatsapp } = formData;
        const uf = selectedUf;
        const city = selectedCity;
        const [latitude, longitude] = selectedPosition;
        const items = selectedItems;
        const image = selectedFile;

        const data = new FormData();

        data.append('name', name);
        data.append('email', email);
        data.append('whatsapp', whatsapp);
        data.append('uf', uf);
        data.append('city', city);
        data.append('latitude', String(latitude));
        data.append('longitude', String(longitude));
        data.append('items', items.join(','));
    
        if(image) {
            data.append('image', image);
        }

        await api.post('points', data);
        alert('Cadastrado com sucesso!');
        history.push('/');
    }

    return (
        <div id="page-create-point">
            <header>
                <img src={logo} alt="Ecoleta"/>

                <Link to="/">
                    <FiArrowLeft/>
                    Voltar
                </Link>
            </header>

            <form onSubmit={handleSubmit}>
                <h1>Cadastro do<br/>ponto de coleta</h1>

                <Dropzone onFileUploaded={setSelectedFile} />

                <fieldset>
                    <legend>
                        <h2>Dados</h2>
                    </legend>

                    <div className="field">
                        <label htmlFor="name">Nome da entidade</label>
                        <input 
                            type="text"
                            name="name"
                            id="name"
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="email">E-mail</label>
                            <input 
                                type="email"
                                name="email"
                                id="email"
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="whatsapp">WhatsApp</label>
                            <input 
                                type="text"
                                name="whatsapp"
                                id="whatsapp"
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>
                        <h2>Endereço</h2>
                        <span>Selecione o endereço no mapa</span>
                    </legend>

                    <Map center={initialPosition} zoom={15} onClick={handleMapClick}>
                        <TileLayer
                            attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={selectedPosition} />
                    </Map>

                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="uf">Estado (UF)</label>
                            <select name="uf" id="uf" value={selectedUf} onChange={handleSelectedUF}>
                                <option value="0" disabled selected>Selecione...</option>
                                {ufs.map(uf => (
                                    <option key={uf.abbreviation} value={uf.abbreviation}>{uf.name} ({uf.abbreviation})</option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="city">Cidade</label>
                            <select name="city" id="city" value={selectedCity} onChange={handleSelectedCity} disabled={disabledCity}>
                            <option value="0" disabled selected>Selecione...</option>
                                {cities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>
                        <h2>Itens de coleta</h2>
                        <span>Selecione um ou mais itens abaixo</span>
                    </legend>

                    <ul className="items-grid">
                        {items.map(item => (
                            <li 
                                key={item.id} 
                                onClick={() => handleSelectedItem(item.id)}
                                className={selectedItems.includes(item.id) ? 'selected' : ''}
                            >
                                <img src={item.image_url} alt=""/>
                                <span>{item.name}</span>
                            </li>
                        )
                        )}
                    </ul>
                </fieldset>

                <button type="submit">Cadastrar ponto de coleta</button>
            </form>
        </div>
    );
};

export default CreatePoint;