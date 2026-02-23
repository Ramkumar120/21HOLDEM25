import { getDirtyFormValues } from "helper/helper";
import { getProfile, updateProfile } from "query/profile.query";
import React, { useEffect, useState } from "react";
import { Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { ReactToastify } from "shared/utils";

const Profile = () => {

    const [payload, setPayload] = useState({});
    const queryClient = useQueryClient()
    const [avatarList, setAvatarList] = useState();
    const { control, register, reset, watch, formState: { errors, isDirty, dirtyFields }, handleSubmit, setValue } = useForm({ mode: "all" });

    const { data: profileData, isLoading: isProfileDataLoading } = useQuery("getProfile", getProfile, {
        select: (data) => data?.data?.data,
        onSuccess: (response) => {
            reset({
                sUserName: response?.sUserName,
                sAvatar: response?.sAvatar,
            })
            handleAvatarList(response?.aAvatar?.aAvatar, response?.sAvatar)
        },
    });

    const handleAvatarList = (aAvatarList, sAvatar) => {
        setAvatarList(
            aAvatarList?.map((item, index) => ({
                id: index + 1,
                selected: item === sAvatar,
                sPath: item,
            }))
        )
    }

    const handleAvatarSelect = (avatar) => {
        const selectedAvatar = avatarList.find(item => item.sPath === avatar.sPath);
        if (selectedAvatar) {
            // setValue('sAvatar', selectedAvatar.sPath);
            setValue('sAvatar', selectedAvatar.sPath, { shouldDirty: true });
            setAvatarList(prevList => prevList.map(item => ({
                ...item,
                selected: item.sPath === avatar.sPath
            })));
        }
    }

    const { mutate: mutateProfileUpdate } = useMutation("updateProfile", updateProfile, {
        onSuccess: (response) => {
            if (response?.status === 200) {
                ReactToastify(response?.data?.message, 'success');
            }
            else {
                ReactToastify(response?.data?.message, 'error');
            }
            queryClient.invalidateQueries('getProfile')
            queryClient.invalidateQueries('profileData')
        },
        onError: (error) => {
            ReactToastify(error?.response?.data?.message, 'error');
        }
    });

    useEffect(() => {
        const isDirtyField = {
            sUserName: watch("sUserName") || "-",
            sAvatar: watch("sAvatar") || "-",
        };

        const payloadData = getDirtyFormValues(dirtyFields, isDirtyField);
        setPayload(payloadData);
    }, [watch("sUserName"), watch('sAvatar'), isDirty, dirtyFields]);


    const onSubmit = (data) => {
        isDirty && mutateProfileUpdate(payload);
    }

    return (
        <>
            <div className="profile">
                <div className="profile-header">My Profile</div>
                <Form className="profile-content" onSubmit={handleSubmit(onSubmit)}>
                    {
                        isProfileDataLoading ? (
                            <Spinner animation="border" className="mx-auto d-block" variant="white" />
                        ) : (
                            profileData && (
                                <>
                                    <Row>
                                        <Col xl={4}>
                                            <div className="avatar">
                                                <img src={profileData?.sAvatar} alt="avatar" draggable='false' />
                                            </div>
                                            <div className="avatar-name">{watch('sUserName')}</div>
                                            <Form.Group>
                                                <Form.Label>Username</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Enter username"
                                                    isInvalid={!!errors.sUserName}
                                                    {...register("sUserName", {
                                                        required: "Username is required",
                                                        minLength: {
                                                            value: 4,
                                                            message: "Username must be at least 4 characters"
                                                        }
                                                    })}
                                                />
                                            </Form.Group>
                                            <Form.Group className="mt-3">
                                                <Form.Label>Email ID</Form.Label>
                                                <div className="form-control disabled" >{profileData?.sEmail ?? '-'}</div>
                                            </Form.Group>
                                        </Col>
                                        <Col xl={8}>
                                            <div className="profile-stats">
                                                <div>
                                                    <div className="stats-value">{profileData?.nGamePlayed ?? '0'}</div>
                                                    <div className="stats-title">Total Game Played</div>
                                                </div>
                                                <div>
                                                    <div className="stats-value">{profileData?.nGameWon ?? '0'}</div>
                                                    <div className="stats-title">Total Win</div>
                                                </div>
                                                <div>
                                                    <div className="stats-value">{profileData?.nGameLost ?? '0'}</div>
                                                    <div className="stats-title">Total Lost</div>
                                                </div>
                                            </div>

                                            <div className="avatar-list">
                                                {/* <div className="avatar-select-image selected"><FontAwesomeIcon icon={faCircleCheck} className="select-icon" /><img src={avatarImage} alt="" /></div> */}
                                                {
                                                    avatarList?.map((avatar, index) => (
                                                        <div key={index} className={`avatar-select-image ${avatar?.selected ? 'selected' : ''}`}>
                                                            {avatar?.selected && <FontAwesomeIcon icon={faCircleCheck} className="select-icon" />}
                                                            <img src={avatar?.sPath} alt="" draggable='false' onClick={() => handleAvatarSelect(avatar)} />
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </Col>
                                    </Row>
                                    <Button type="submit" className={`profile-submit ${!isDirty ? 'disable' : ''}`} disabled={!isDirty}>Save</Button>
                                </>
                            )
                        )
                    }
                </Form>
            </div>
        </>
    )
}
export default Profile;