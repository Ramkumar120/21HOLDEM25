import { getTables, joinTable } from 'query/gameTable.query';
import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getCookie, ReactToastify } from 'shared/utils';
import gift_icon from '../../assets/images/icons/gift_icon.png';
import privateTable_icon from '../../assets/images/icons/privateTable_icon.png';
import CustomTable from 'shared/components/Table';
import { Col, Row, Spinner } from 'react-bootstrap';

const Dashboard = () => {
    const navigate = useNavigate();
    // const [microTablesData, setMicroTablesData] = useState([]);
    // const [normalTablesData, setNormalTablesData] = useState([]);
    // const [eliteTablesData, setEliteTablesData] = useState([]);
    const [tablesData, setTablesData] = useState([]);
    const [activeTab, setActiveTab] = useState('micro');
    const queryClient = useQueryClient();

    const { mutate: joinTableMutate, isLoading: joinTableLoading } = useMutation(joinTable, {
        onSuccess: (data) => {
            if (data.status === 200) {
                navigate(`/game`, { state: { sAuthToken: getCookie('sAuthToken'), iBoardId: data.data.data.iBoardId } });
            }
        },
        onError: (error) => {
            console.log(error);
            ReactToastify(error?.response?.data?.message, 'error');
            queryClient.invalidateQueries("getTables");
        },
    });

    const { data: dataTabel, isLoading: isDataTabelLoading } = useQuery("getTables", getTables, {
        onSuccess: (data) => {
            if (data.status === 200) {
                setTablesData([]);
                // setMicroTablesData([]);
                // setNormalTablesData([]);
                // setEliteTablesData([]);

                const tables = data.data.data;
                setTablesData(tables);
                // setMicroTablesData(tables.filter(table => table.nMinBuyIn <= 500));
                // setNormalTablesData(tables.filter(table => table.nMinBuyIn > 500 && table.nMinBuyIn <= 15000));
                // setEliteTablesData(tables.filter(table => table.nMinBuyIn > 15000 && table.nMinBuyIn <= 50000));
            }
            if (data.status === 404) {
                console.log("table not found");
            }
        },
        onError: (error) => {
            console.log(error);
        },
    });


    return (
        <div className='dashboard-container'>
            <div className='dashboard-container__content'>
                <div className='dashboard-container__content-table-selection'>
                    {/* <div className='dashboard-container__content-table-selection-menu'>
                        <ul>
                            <li className={activeTab === 'micro' ? 'active' : ''}>
                                <a onClick={() => setActiveTab('micro')}>Micro Stakes</a>
                            </li>
                            <li className={activeTab === 'normal' ? 'active' : ''}>
                                <a onClick={() => setActiveTab('normal')}>Normal Stakes</a>
                            </li>
                            <li className={activeTab === 'elite' ? 'active' : ''}>
                                <a onClick={() => setActiveTab('elite')}>Elite Stakes</a>
                            </li>
                        </ul>
                    </div> */}
                    <div className='dashboard-container__content-table-selection-content'>
                        <div className='sub-dashboard-container__content'>
                            <div className='dashboard-container__content-table-selection-content-options'>
                                <Link to={'/daily-rewards'}><img src={gift_icon} alt='gift' />Daily Rewards</Link>
                                <Link to={'/private-table'}><img src={privateTable_icon} alt='private table' />Private Table</Link>
                            </div>
                            <div className='dashboard-container__content-table-selection-content-tables'>
                                <Row className='g-2'>
                                    {!isDataTabelLoading
                                        ? <>
                                            {
                                                tablesData.length > 0 ? tablesData.map((table, index) => (
                                                    <Col xl={4} lg={4} md={6} sm={12} xs={12} key={index} className='dashboard-table'>
                                                        <CustomTable isPrivate={false} key={table._id} tableName={table.sName} minChips={table.nMinBet} isRapid={table?.nRapidPlay} minBuyIn={table.nMinBuyIn} isMultiDeck={table?.nMultiDeck} onPlay={() => joinTableMutate(table._id)} />
                                                    </Col>
                                                )) : <Col xl={12} lg={12} md={12} sm={12} xs={12} className='no-table'>No tables found!</Col>
                                            }
                                            {/* {
                                                activeTab === 'micro' && (
                                                    microTablesData.length > 0 ? microTablesData.map((table, index) => (
                                                        <Col xl={4} lg={4} md={6} sm={12} xs={12} key={index} className='dashboard-table'>
                                                            <CustomTable isPrivate={false} key={table._id} tableName={table.sName} minChips={table.nMinBet} entryAmount={table.nMinBuyIn} onPlay={() => joinTableMutate(table._id)} />
                                                        </Col>
                                                    )) : <Col xl={12} lg={12} md={12} sm={12} xs={12} className='no-table'>No tables found!</Col>
                                                )
                                            }
                                            {
                                                activeTab === 'normal' && (
                                                    normalTablesData.length > 0 ? (
                                                        normalTablesData.map((table, index) => (
                                                            <Col xl={4} lg={4} md={6} sm={12} xs={12} key={index} className='dashboard-table'>
                                                                <CustomTable isPrivate={false} key={table._id} tableName={table.sName} minChips={table.nMinBet} entryAmount={table.nMinBuyIn} onPlay={() => joinTableMutate(table._id)} />
                                                            </Col>
                                                        ))
                                                    ) : <Col xl={12} lg={12} md={12} sm={12} xs={12} className='no-table'>No tables found!</Col>
                                                )
                                            }
                                            {
                                                activeTab === 'elite' && (
                                                    eliteTablesData.length > 0 ? eliteTablesData.map((table, index) => (
                                                        <Col xl={4} lg={4} md={6} sm={12} xs={12} key={index} className='dashboard-table'>
                                                            <CustomTable isPrivate={false} key={table._id} tableName={table.sName} minChips={table.nMinBet} entryAmount={table.nMinBuyIn} onPlay={() => joinTableMutate(table._id)} />
                                                        </Col>
                                                    )) : <Col xl={12} lg={12} md={12} sm={12} xs={12} className='no-table'>No tables found!</Col>
                                                )
                                            } */}
                                        </>
                                        : <Col xl={12} lg={12} md={12} sm={12} xs={12} ><Spinner variant='white mx-auto d-block' /></Col>
                                    }
                                </Row>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}

export default Dashboard