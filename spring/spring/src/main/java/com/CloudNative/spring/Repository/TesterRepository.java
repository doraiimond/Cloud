package com.CloudNative.spring.Repository;

import com.CloudNative.spring.Model.Tester;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TesterRepository extends JpaRepository<Tester, Long> {
}
